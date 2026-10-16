import "server-only";
import { withGst, type PlanCode } from "@/lib/billing";
import { formatDateTimeIst } from "@/lib/dates";
import { maskMobile } from "@/lib/mask";
import { normaliseMobile } from "@/lib/validators";
import { audit } from "@/server/audit";
import { encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { paymentProvider, paymentProviderByName } from "@/server/providers/payments";
import type { RequestContext } from "@/server/context";

// Plans, wallet and billing (PRD S03, S19; FR-BIL-01–06, 08). Money and units only move through the database
// functions in the Part 3 migration; this module reads, starts checkouts and hands webhooks to them.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

/** Database errors raised by the billing functions, mapped to messages for the user. */
const MESSAGES: Record<string, [ConstructorParameters<typeof AppError>[0], string]> = {
  ALREADY_SUBSCRIBED: ["conflict", "Your organisation already has an active plan. Change plans from Plan and usage."],
  UNKNOWN_PLAN: ["bad_request", "This plan is not available."],
  TOPUP_OUT_OF_RANGE: ["validation_failed", "Enter an amount between ₹1,000 and ₹5,00,000."],
  INSUFFICIENT_BALANCE: ["conflict", "Not enough units or wallet balance. Add money to the wallet or upgrade the plan."],
  UNKNOWN_ITEM: ["bad_request", "This service is not available."],
  NO_PRICE: ["unavailable", "This service has no price yet. Please contact support."],
  HOLD_NOT_FOUND: ["not_found", "This charge was not found."],
  HOLD_REVERSED: ["conflict", "This charge was already reversed."],
  HOLD_COMMITTED: ["conflict", "This charge was already completed."],
};

export function mapBillingError(e: unknown): never {
  const message = e instanceof Error ? e.message : "";
  const key = Object.keys(MESSAGES).find((k) => message.includes(k));
  if (key) {
    const [code, text] = MESSAGES[key];
    throw new AppError(code, text, code === "validation_failed" ? { amount: text } : undefined);
  }
  throw e;
}

const big = (v: string | number | bigint | null | undefined) => BigInt(v ?? 0);

// ---------------------------------------------------------------- catalogue

export interface CatalogueItem {
  code: string;
  name: string;
  pricePaise: bigint;
  gstPaise: bigint;
}

export interface CataloguePlan {
  code: PlanCode;
  name: string;
  recommended: boolean;
  versionId: string;
  pricePaise: bigint;
  gstPaise: bigint;
  totalPaise: bigint;
  periodMonths: number;
  seats: number;
  items: { code: string; name: string; quantity: number }[];
}

/** Plans with their entitlements and every item's pay-per-use price, as they apply now. */
export async function loadCatalogue(): Promise<{ plans: CataloguePlan[]; items: CatalogueItem[] }> {
  const db = sql();
  const [plans, entitlements, items] = await Promise.all([
    db<{ code: PlanCode; name: string; recommended: boolean; id: string; price_paise: string; period_months: number; seats: number }[]>`
      select p.code, p.name, p.recommended, v.id, v.price_paise, v.period_months, v.seats
        from public.plans p
        cross join lateral (select * from app_private.current_plan_version(p.code)) v
       where p.active and v.id is not null
       order by p.sort`,
    db<{ plan_version_id: string; item_code: string; name: string; quantity: number }[]>`
      select i.plan_version_id, i.item_code, b.name, i.quantity
        from public.plan_version_items i join public.billing_items b on b.code = i.item_code
       order by b.sort`,
    db<{ code: string; name: string; price_paise: string; gst_rate_bp: number }[]>`
      select b.code, b.name, p.price_paise, p.gst_rate_bp
        from public.billing_items b
        cross join lateral (select * from app_private.current_price(b.code)) p
       where b.active and p.id is not null
       order by b.sort`,
  ]);
  return {
    plans: plans.map((p) => {
      const price = withGst(big(p.price_paise));
      return {
        code: p.code, name: p.name, recommended: p.recommended, versionId: p.id,
        pricePaise: price.taxable, gstPaise: price.gst, totalPaise: price.total,
        periodMonths: p.period_months, seats: p.seats,
        items: entitlements.filter((e) => e.plan_version_id === p.id).map((e) => ({ code: e.item_code, name: e.name, quantity: e.quantity })),
      };
    }),
    items: items.map((i) => {
      const price = big(i.price_paise);
      return { code: i.code, name: i.name, pricePaise: price, gstPaise: (price * BigInt(i.gst_rate_bp) + 5_000n) / 10_000n };
    }),
  };
}

/** S03 "Billing GSTIN": read-only, from the organisation profile. */
export async function billingGstin(orgId: string): Promise<string | null> {
  const [o] = await sql()<{ gstin: string | null }[]>`select gstin from public.organisations where id = ${orgId}`;
  return o?.gstin ?? null;
}

// ---------------------------------------------------------------- plan, wallet, usage

export interface PlanSummary {
  code: PlanCode;
  name: string;
  status: "active" | "grace" | "expired" | "cancelled";
  startsAt: Date;
  endsAt: Date;
  autoRenew: boolean;
  seats: number;
}

/** The organisation's current plan (null on pay-per-use), wallet and alert amount. Readable by every member. */
export async function billingSummary(orgId: string) {
  const db = sql();
  const [[plan], [wallet], [units]] = await Promise.all([
    db<{ code: PlanCode; name: string; status: PlanSummary["status"]; starts_at: Date; ends_at: Date; auto_renew: boolean; seats: number }[]>`
      select p.code, p.name, s.status::text as status, s.starts_at, s.ends_at, s.auto_renew, v.seats
        from public.subscriptions s
        join public.plan_versions v on v.id = s.plan_version_id
        join public.plans p on p.code = v.plan_code
       where s.org_id = ${orgId} and s.status in ('active', 'grace')
       order by s.starts_at desc limit 1`,
    db<{ balance_paise: string; alert_paise: string | null }[]>`
      select balance_paise, alert_paise from public.wallets where org_id = ${orgId}`,
    db<{ left: number | null }[]>`
      select sum(i.quantity + coalesce(u.units, 0))::int as left
        from (select * from app_private.usable_subscription(${orgId}::uuid)) s
        join public.plan_version_items i on i.plan_version_id = s.plan_version_id
        left join lateral (
          select sum(l.units) as units from public.usage_ledger l
           where l.subscription_id = s.id and l.item_code = i.item_code and l.source = 'plan') u on true
       where s.id is not null`,
  ]);
  const walletPaise = big(wallet?.balance_paise);
  const alertPaise = wallet?.alert_paise == null ? null : big(wallet.alert_paise);
  return {
    plan: plan
      ? { code: plan.code, name: plan.name, status: plan.status, startsAt: plan.starts_at, endsAt: plan.ends_at, autoRenew: plan.auto_renew, seats: plan.seats } satisfies PlanSummary
      : null,
    unitsLeft: units?.left ?? 0,
    walletPaise,
    alertPaise,
    lowBalance: alertPaise !== null && walletPaise < alertPaise,
  };
}

/** S19 marker 3: every item with included, used, remaining and pay-per-use price. */
export async function usageTable(orgId: string) {
  const [catalogue, rows] = await Promise.all([
    loadCatalogue(),
    sql()<{ item_code: string; included: number; used: number }[]>`
      select i.item_code, i.quantity as included, coalesce(-sum(l.units), 0)::int as used
        from (select * from app_private.usable_subscription(${orgId}::uuid)) s
        join public.plan_version_items i on i.plan_version_id = s.plan_version_id
        left join public.usage_ledger l on l.subscription_id = s.id and l.item_code = i.item_code and l.source = 'plan'
       where s.id is not null
       group by i.item_code, i.quantity`,
  ]);
  const byCode = new Map(rows.map((r) => [r.item_code, r]));
  return catalogue.items.map((item) => {
    const r = byCode.get(item.code);
    return {
      code: item.code,
      name: item.name,
      included: r?.included ?? 0,
      used: r?.used ?? 0,
      remaining: r ? Math.max(0, r.included - r.used) : 0,
      pricePaise: item.pricePaise,
      gstPaise: item.gstPaise,
    };
  });
}

// ---------------------------------------------------------------- ledger and invoices

export interface LedgerRow {
  id: string;
  at: Date;
  type: "hold" | "commit" | "reverse" | "topup" | "adjust";
  source: "plan" | "wallet";
  itemCode: string | null;
  itemName: string | null;
  units: number;
  amountPaise: bigint;
  gstPaise: bigint;
  balanceAfterPaise: bigint | null;
  refType: string | null;
  refId: string | null;
  note: string | null;
}

/** S19 marker 4: every debit and credit, newest first, optionally limited to an IST date range (inclusive). */
export async function ledger(orgId: string, opts: { from?: string; to?: string; limit?: number } = {}): Promise<LedgerRow[]> {
  const from = opts.from ?? "2000-01-01";
  const to = opts.to ?? "2999-12-31";
  const rows = await sql()<{
    id: string; at: Date; type: LedgerRow["type"]; source: LedgerRow["source"]; item_code: string | null; name: string | null; units: number;
    amount_paise: string; gst_paise: string; balance_after_paise: string | null; ref_type: string | null; ref_id: string | null; note: string | null;
  }[]>`
    select l.id, l.at, l.type::text as type, l.source::text as source, l.item_code, b.name, l.units, l.amount_paise, l.gst_paise,
           l.balance_after_paise, l.ref_type, l.ref_id, l.note
      from public.usage_ledger l left join public.billing_items b on b.code = l.item_code
     where l.org_id = ${orgId}
       and l.at >= (${from}::date::timestamp at time zone 'Asia/Kolkata')
       and l.at < ((${to}::date + 1)::timestamp at time zone 'Asia/Kolkata')
     order by l.at desc, l.id desc
     limit ${Math.min(opts.limit ?? 200, 5000)}`;
  return rows.map((r) => ({
    id: String(r.id), at: r.at, type: r.type, source: r.source, itemCode: r.item_code, itemName: r.name, units: r.units,
    amountPaise: big(r.amount_paise), gstPaise: big(r.gst_paise),
    balanceAfterPaise: r.balance_after_paise === null ? null : big(r.balance_after_paise),
    refType: r.ref_type, refId: r.ref_id, note: r.note,
  }));
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const rupees = (paise: bigint) => {
  const neg = paise < 0n;
  const abs = neg ? -paise : paise;
  return `${neg ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
};

/** S19 ledger statement (CSV). Amounts in rupees with two decimals; times in IST. */
export function ledgerCsv(rows: LedgerRow[]): string {
  const header = ["Date and time (IST)", "Entry", "Paid from", "Item", "Units", "Debit (INR)", "Credit (INR)", "GST in amount (INR)", "Wallet balance (INR)", "Reference", "Note"];
  const lines = rows.map((r) => [
    formatDateTimeIst(r.at), r.type, r.source, r.itemName ?? "", String(r.units),
    r.amountPaise < 0n ? rupees(-r.amountPaise) : "", r.amountPaise > 0n ? rupees(r.amountPaise) : "",
    rupees(r.gstPaise < 0n ? -r.gstPaise : r.gstPaise),
    r.balanceAfterPaise === null ? "" : rupees(r.balanceAfterPaise),
    r.refType ? `${r.refType}:${r.refId ?? ""}` : "", r.note ?? "",
  ].map(csvCell).join(","));
  return [header.join(","), ...lines].join("\r\n") + "\r\n";
}

export interface InvoiceRow {
  id: string;
  number: string;
  issuedAt: Date;
  description: string;
  taxablePaise: bigint;
  cgstPaise: bigint;
  sgstPaise: bigint;
  igstPaise: bigint;
  totalPaise: bigint;
  placeOfSupply: string;
  sac: string;
  supplier: { legal_name: string; gstin: string | null; state_code: string; address: string };
  customer: { legal_name: string; trade_name: string | null; gstin: string | null; state_code: string | null; address: unknown };
}

type InvoiceDbRow = {
  id: string; number: string; issued_at: Date; description: string; taxable_paise: string; cgst_paise: string; sgst_paise: string;
  igst_paise: string; total_paise: string; place_of_supply: string; sac: string; supplier: InvoiceRow["supplier"]; customer: InvoiceRow["customer"];
};

const toInvoice = (r: InvoiceDbRow): InvoiceRow => ({
  id: r.id, number: r.number, issuedAt: r.issued_at, description: r.description,
  taxablePaise: big(r.taxable_paise), cgstPaise: big(r.cgst_paise), sgstPaise: big(r.sgst_paise), igstPaise: big(r.igst_paise),
  totalPaise: big(r.total_paise), placeOfSupply: r.place_of_supply, sac: r.sac, supplier: r.supplier, customer: r.customer,
});

export async function listInvoices(orgId: string): Promise<InvoiceRow[]> {
  const rows = await sql()<InvoiceDbRow[]>`
    select id, number, issued_at, description, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, place_of_supply, sac, supplier, customer
      from public.invoices where org_id = ${orgId} order by issued_at desc, seq desc limit 200`;
  return rows.map(toInvoice);
}

export async function getInvoice(orgId: string, id: string): Promise<InvoiceRow> {
  const [row] = await sql()<InvoiceDbRow[]>`
    select id, number, issued_at, description, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, place_of_supply, sac, supplier, customer
      from public.invoices where org_id = ${orgId} and id = ${id}`;
  if (!row) throw notFound("This invoice");
  return toInvoice(row);
}

// ---------------------------------------------------------------- checkout and payments

export type CheckoutInput = { purpose: "plan"; plan: PlanCode } | { purpose: "topup"; amountPaise: bigint };

/** Paths the gateway may send the browser back to after paying. */
export const RETURN_PATHS = { signup: "/signup/plan", change: "/account/plan/change", billing: "/account/billing" } as const;

/** S03 marker 6 and S19 "Add money": creates the order and opens the gateway's checkout. */
export async function startCheckout(ctx: Ctx, input: CheckoutInput, returnTo: keyof typeof RETURN_PATHS, origin: string) {
  const provider = paymentProvider();
  let order: { id: string; total_paise: string };
  try {
    [order] = await sql()<{ id: string; total_paise: string }[]>`
      select id, total_paise from app_private.create_payment_order(
        ${ctx.orgId}::uuid, ${input.purpose}::public.payment_purpose,
        ${input.purpose === "plan" ? input.plan : null}, ${input.purpose === "topup" ? input.amountPaise.toString() : null}::bigint,
        ${provider.name}, ${ctx.user.id}::uuid)`;
  } catch (e) {
    mapBillingError(e);
  }
  const returnUrl = `${origin}${RETURN_PATHS[returnTo]}?order=${order.id}`;
  const created = await provider.createOrder({ orderId: order.id, amountPaise: big(order.total_paise), returnUrl });
  await sql()`update public.payment_orders set provider_order_id = ${created.providerOrderId} where id = ${order.id}`;
  await audit(ctx, {
    action: "payment.started", entity: "payment_order", entityId: order.id,
    after: { purpose: input.purpose, plan: input.purpose === "plan" ? input.plan : null, total_paise: Number(order.total_paise) },
  });
  return { orderId: order.id, checkoutUrl: created.checkoutUrl };
}

/** S03 "We are confirming your payment": the order as the webhook left it. */
export async function orderStatus(orgId: string, id: string) {
  const [o] = await sql()<{ status: string; purpose: string; failure_reason: string | null; total_paise: string; invoice_id: string | null; created_at: Date }[]>`
    select o.status::text, o.purpose::text, o.failure_reason, o.total_paise, i.id as invoice_id, o.created_at
      from public.payment_orders o left join public.invoices i on i.payment_order_id = o.id
     where o.org_id = ${orgId} and o.id = ${id}`;
  if (!o) throw notFound("This payment");
  return {
    status: o.status as "created" | "paid" | "failed" | "cancelled",
    purpose: o.purpose as "plan" | "topup",
    failureReason: o.failure_reason,
    totalPaise: big(o.total_paise),
    invoiceId: o.invoice_id,
    createdAt: o.created_at,
  };
}

/** Verifies and applies one gateway webhook. Safe to call any number of times for the same event. */
export async function handlePaymentWebhook(providerName: string, rawBody: string, headers: Headers) {
  const provider = paymentProviderByName(providerName);
  if (!provider) throw notFound("This payment provider");
  let event;
  try {
    event = provider.parseWebhook(rawBody, headers);
  } catch {
    throw new AppError("unauthenticated", "The webhook signature is not valid.");
  }
  const [result] = await sql()<{ order_id: string | null; outcome: string }[]>`
    select * from app_private.apply_payment_event(${provider.name}, ${event.eventId}, ${event.type}, ${event.providerOrderId},
      ${event.providerPaymentId}, ${event.amountPaise.toString()}::bigint, ${event.failureReason},
      ${sql().json(JSON.parse(rawBody))}::jsonb)`;
  if (result.outcome === "amount_mismatch" || result.outcome === "unknown_order" || result.outcome === "already_subscribed") {
    console.error(`[payments] ${provider.name} event ${event.eventId}: ${result.outcome} (order ${result.order_id ?? event.providerOrderId})`);
  }
  return { orderId: result.order_id, outcome: result.outcome };
}

// ---------------------------------------------------------------- settings and custom plans

/** S19: auto-renew (FR-BIL-08) and the low-balance alert amount. */
export async function updateBillingSettings(ctx: Ctx, input: { autoRenew?: boolean; alertPaise?: bigint | null }) {
  const db = sql();
  if (input.autoRenew !== undefined) {
    const [sub] = await db<{ id: string; auto_renew: boolean }[]>`
      select id, auto_renew from public.subscriptions where org_id = ${ctx.orgId} and status in ('active', 'grace')`;
    if (!sub) throw new AppError("conflict", "There is no active plan to renew.");
    await db`update public.subscriptions set auto_renew = ${input.autoRenew} where id = ${sub.id}`;
    await audit(ctx, { action: "subscription.auto_renew_changed", entity: "subscription", entityId: sub.id, before: { autoRenew: sub.auto_renew }, after: { autoRenew: input.autoRenew } });
  }
  if (input.alertPaise !== undefined) {
    await db`insert into public.wallets (org_id) values (${ctx.orgId}) on conflict (org_id) do nothing`;
    await db`update public.wallets set alert_paise = ${input.alertPaise === null ? null : input.alertPaise.toString()}::bigint, updated_at = now() where org_id = ${ctx.orgId}`;
    await audit(ctx, { action: "wallet.alert_changed", entity: "wallet", entityId: ctx.orgId, after: { alertPaise: input.alertPaise === null ? null : Number(input.alertPaise) } });
  }
  return billingSummary(ctx.orgId);
}

/** S03 marker 4: "Need Something Different?" goes to the sales team. */
export async function requestCustomPlan(ctx: Ctx, input: { name: string; mobile: string; expectedChecks: number | null; message: string | null }) {
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) throw new AppError("validation_failed", "Please check the mobile.", { mobile: "Enter a valid mobile number." });
  const [row] = await sql()<{ id: string }[]>`
    insert into app_private.custom_plan_leads (org_id, user_id, name, mobile_ciphertext, mobile_masked, expected_checks, message)
    values (${ctx.orgId}, ${ctx.user.id}, ${input.name}, ${encryptField(mobile, "custom_plan_leads.mobile")}, ${maskMobile(mobile)},
            ${input.expectedChecks}, ${input.message})
    returning id`;
  await audit(ctx, { action: "custom_plan.requested", entity: "custom_plan_lead", entityId: row.id, after: { expectedChecks: input.expectedChecks } });
  return { id: row.id };
}
