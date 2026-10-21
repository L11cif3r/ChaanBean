import "server-only";
import crypto from "node:crypto";
import type { JSONValue } from "postgres";
import { istDate, istInstant, addDays } from "@/lib/dates";
import { maskEmail, maskMobile } from "@/lib/mask";
import {
  SETTLEMENT_AWAITING, SETTLEMENT_EDITABLE, SETTLEMENT_ITEM, rowsOf, scheduleState, settlementProblems, settlementSchema, waivedPaise,
  type InstalmentState, type Row, type SettlementMode, type SettlementStatus,
} from "@/lib/settlements";
import { TX_RULES, type PaymentMode } from "@/lib/transactions";
import { audit } from "@/server/audit";
import { billingSummary, priceList } from "@/server/billing/service";
import { commitHold, placeHold, reverseHold } from "@/server/billing/charge";
import { decryptField, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { enqueue } from "@/server/jobs/runner";
import { queueMessage } from "@/server/outbox";
import { settlementPdf, type SettlementDoc } from "@/server/pdf/settlement";
import { GST_STATES } from "@/server/providers/identity/states";
import { evidenceStore } from "@/server/storage";
import {
  counterpartyPhone, hashToken, positionOf, refreshRunning, tellUser, txCols, txEvent, type TxRow,
} from "@/server/transactions/service";
import type { RequestContext } from "@/server/context";

// E-Settlement, the creditor's side (PRD v3.0 8.7; v1.0 5.8, S17, FR-ES-01–05).
// Draft (from an overdue agreement, or an outside debt) → send (one BS_SETTLEMENT unit, held until the debtor opens
// the link) → the debtor accepts by OTP, rejects or counter-proposes on the public page (./public.ts) → sealed, the
// original agreement moves to Settled → instalments tracked Due, Paid or Missed → Completed, or Defaulted (the
// original balance with interest is due again, less what was paid).

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

export interface StRow {
  id: string; org_id: string; counterparty_id: string; transaction_id: string | null; reference: string; status: SettlementStatus;
  version: number; outside_bill_no: string | null; outside_bill_date: string | null; owed_paise: string; owed_on: string;
  settlement_paise: string; interest_agreed_paise: string; waived_paise: string; mode: SettlementMode; grace_days: number;
  terms: string; channels: string[]; link_valid_days: number; link_token_hash: string | null; link_token_ciphertext: string | null;
  link_base: string | null; link_expires_at: Date | null; hold_id: string | null; sent_at: Date | null; viewed_at: Date | null;
  decided_at: Date | null; sealed_at: Date | null; closed_at: Date | null; created_by: string | null; created_at: Date;
}

export const stCols = () => sql()`id, org_id, counterparty_id, transaction_id, reference, status, version, outside_bill_no,
  to_char(outside_bill_date, 'YYYY-MM-DD') as outside_bill_date, owed_paise, to_char(owed_on, 'YYYY-MM-DD') as owed_on,
  settlement_paise, interest_agreed_paise, waived_paise, mode, grace_days, terms, channels, link_valid_days, link_token_hash,
  link_token_ciphertext, link_base, link_expires_at, hold_id, sent_at, viewed_at, decided_at, sealed_at, closed_at,
  created_by, created_at`;

export async function stEvent(
  st: Pick<StRow, "id" | "org_id">,
  actor: { type: "user" | "counterparty" | "system"; id?: string | null; name?: string | null },
  event: string,
  detail: Record<string, unknown> = {},
) {
  await sql()`
    insert into public.settlement_events (settlement_id, org_id, actor_type, actor_id, actor_name, event, detail)
    values (${st.id}, ${st.org_id}, ${actor.type}, ${actor.id ?? null}, ${actor.name ?? null}, ${event}, ${sql().json(detail as JSONValue)})`;
}

const userActor = async (ctx: Ctx) => {
  const [p] = await sql()<{ full_name: string | null }[]>`select full_name from public.user_profiles where id = ${ctx.user.id}`;
  return { type: "user" as const, id: ctx.user.id, name: p?.full_name ?? null };
};

async function loadSt(ctx: Ctx, id: string): Promise<StRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("This settlement");
  const [st] = await sql()<StRow[]>`select ${stCols()} from public.settlements where id = ${id} and org_id = ${ctx.orgId}`;
  if (!st) throw notFound("This settlement");
  return st;
}

export async function rowsFor(settlementId: string): Promise<(Row & { seq: number; status: string; paidPaise: number; paidOn: string | null })[]> {
  const rows = await sql()<{ seq: number; due_date: string; amount_paise: string; status: string; paid_paise: string; paid_on: string | null }[]>`
    select seq, to_char(due_date, 'YYYY-MM-DD') as due_date, amount_paise, status::text as status, paid_paise,
           to_char(paid_on, 'YYYY-MM-DD') as paid_on
      from public.settlement_instalments where settlement_id = ${settlementId} order by seq`;
  return rows.map((r) => ({ seq: r.seq, dueDate: r.due_date, amountPaise: Number(r.amount_paise), status: r.status, paidPaise: Number(r.paid_paise), paidOn: r.paid_on }));
}

async function writeRows(st: Pick<StRow, "id" | "org_id">, rows: Row[]) {
  const db = sql();
  await db`delete from public.settlement_instalments where settlement_id = ${st.id}`;
  if (!rows.length) return;
  await db`insert into public.settlement_instalments ${db(
    rows.map((r, i) => ({ settlement_id: st.id, org_id: st.org_id, seq: i + 1, due_date: r.dueDate, amount_paise: r.amountPaise })),
  )}`;
}

// ---------------------------------------------------------------- what is owed (S17 marker 1)

export interface OverdueOption {
  id: string;
  reference: string;
  counterpartyId: string;
  counterpartyName: string;
  balancePaise: number;
  interestPaise: number;
  owedPaise: number;
  daysOverdue: number;
}

/** An overdue agreement that can be settled, with its balance and interest to today (FR-ES-01). */
async function overdueTx(ctx: Ctx, transactionId: string, exceptSettlement?: string): Promise<{ tx: TxRow; option: OverdueOption }> {
  const [tx] = await sql()<TxRow[]>`select ${txCols()} from public.transactions where id = ${transactionId} and org_id = ${ctx.orgId}`;
  if (!tx) throw new AppError("validation_failed", "Select the agreement to settle.", { transactionId: "Select the agreement to settle." });
  const status = await refreshRunning(tx);
  if (status !== "overdue") throw new AppError("validation_failed", "Only an overdue agreement can be settled.", { transactionId: "Only an overdue agreement can be settled." });
  const [open] = await sql()`
    select 1 from public.settlements where transaction_id = ${tx.id}
       and status not in ('rejected', 'expired', 'cancelled', 'defaulted') ${exceptSettlement ? sql()`and id <> ${exceptSettlement}` : sql()``} limit 1`;
  if (open) throw new AppError("conflict", "This agreement already has a settlement in progress.", { transactionId: "This agreement already has a settlement in progress." });
  const p = await positionOf(tx);
  const [cp] = await sql()<{ legal_name: string }[]>`select legal_name from public.counterparties where id = ${tx.counterparty_id}`;
  return {
    tx,
    option: {
      id: tx.id, reference: tx.reference, counterpartyId: tx.counterparty_id, counterpartyName: cp.legal_name,
      balancePaise: p.principalPaise, interestPaise: p.interestPaise, owedPaise: p.duePaise, daysOverdue: p.daysOverdue,
    },
  };
}

/** What an agreement owes today, for editing its settlement (S17 marker 1). Null once it can no longer be settled. */
export async function owedOption(ctx: Ctx, transactionId: string, settlementId: string) {
  return overdueTx(ctx, transactionId, settlementId).then((r) => r.option).catch(() => null);
}

export interface DebtorOption { id: string; name: string; mobileMasked: string }

/** What the S17 form offers: overdue agreements (with what each owes today) and debtors for an outside debt. */
export async function settlementFormData(ctx: Ctx) {
  const db = sql();
  const [txs, debtors, [org]] = await Promise.all([
    db<TxRow[]>`
      select ${txCols()} from public.transactions t
       where org_id = ${ctx.orgId} and status in ('active', 'partially_paid', 'overdue') and due_date < ${istDate(new Date())}
         and not exists (select 1 from public.settlements s where s.transaction_id = t.id
                          and s.status not in ('rejected', 'expired', 'cancelled', 'defaulted'))
       order by due_date limit 200`,
    db<{ id: string; legal_name: string; mobile_masked: string }[]>`
      select id, legal_name, mobile_masked from public.counterparties where org_id = ${ctx.orgId} and status = 'active' and mobile_hash is not null order by lower(legal_name) limit 500`,
    db<{ address: { city?: string } | null; state_code: string | null }[]>`select address, state_code from public.organisations where id = ${ctx.orgId}`,
  ]);
  const overdue: OverdueOption[] = [];
  for (const tx of txs) {
    await refreshRunning(tx);
    const p = await positionOf(tx);
    if (p.duePaise <= 0) continue;
    overdue.push({
      id: tx.id, reference: tx.reference, counterpartyId: tx.counterparty_id,
      counterpartyName: debtors.find((d) => d.id === tx.counterparty_id)?.legal_name ?? "",
      balancePaise: p.principalPaise, interestPaise: p.interestPaise, owedPaise: p.duePaise, daysOverdue: p.daysOverdue,
    });
  }
  return {
    overdue,
    debtors: debtors.map((d): DebtorOption => ({ id: d.id, name: d.legal_name, mobileMasked: d.mobile_masked })),
    jurisdiction: org?.address?.city || (org?.state_code ? GST_STATES[org.state_code] : null) || "India",
  };
}

// ---------------------------------------------------------------- draft (S17)

async function validate(ctx: Ctx, raw: unknown, exceptSettlement?: string) {
  const input = settlementSchema.parse(raw);
  const today = istDate(new Date());
  let owed: number;
  let counterpartyId = input.counterpartyId;
  if (input.transactionId) {
    const { tx, option } = await overdueTx(ctx, input.transactionId, exceptSettlement);
    owed = option.owedPaise;
    counterpartyId = tx.counterparty_id;
  } else {
    owed = input.outsideOwedPaise ?? 0;
  }
  const problems = settlementProblems(input, owed, today);
  if (Object.keys(problems).length) throw new AppError("validation_failed", "Please check the highlighted fields.", problems);
  const [cp] = await sql()<{ status: string; has_mobile: boolean }[]>`
    select status::text as status, mobile_hash is not null as has_mobile from public.counterparties where id = ${counterpartyId} and org_id = ${ctx.orgId}`;
  if (!cp) throw new AppError("validation_failed", "Select the debtor.", { counterpartyId: "Select the debtor." });
  if (cp.status !== "active") throw new AppError("validation_failed", "This counterparty is archived.", { counterpartyId: "This counterparty is archived. Restore them first." });
  if (!cp.has_mobile) throw new AppError("validation_failed", "Add the debtor's contact first.", { counterpartyId: "Add a contact name and mobile to this debtor first." });
  return { input, owed, counterpartyId, rows: rowsOf(input), today };
}

export async function createSettlement(ctx: Ctx, raw: unknown) {
  const { input, owed, counterpartyId, rows, today } = await validate(ctx, raw);
  const db = sql();
  const [{ reference }] = await db<{ reference: string }[]>`select app_private.next_reference('CHB-ST') as reference`;
  let st: StRow;
  try {
    [st] = await db<StRow[]>`
      insert into public.settlements (org_id, counterparty_id, transaction_id, reference, outside_bill_no, outside_bill_date, owed_paise,
        owed_on, settlement_paise, interest_agreed_paise, waived_paise, mode, grace_days, terms, created_by)
      values (${ctx.orgId}, ${counterpartyId}, ${input.transactionId ?? null}, ${reference},
        ${input.transactionId ? null : input.outsideBillNo ?? null}, ${input.transactionId ? null : input.outsideBillDate ?? null},
        ${owed}, ${today}, ${input.settlementPaise}, ${input.interestAgreedPaise},
        ${waivedPaise(owed, input.settlementPaise, input.interestAgreedPaise)}, ${input.mode}, ${input.graceDays}, ${input.terms}, ${ctx.user.id})
      returning ${stCols()}`;
  } catch (e) {
    if ((e as { constraint_name?: string }).constraint_name === "settlements_one_open") throw new AppError("conflict", "This agreement already has a settlement in progress.");
    throw e;
  }
  await writeRows(st, rows);
  await stEvent(st, await userActor(ctx), "created", { settlementPaise: input.settlementPaise, mode: input.mode, instalments: rows.length });
  if (st.transaction_id) await txEvent({ id: st.transaction_id, org_id: st.org_id }, await userActor(ctx), "settlement_started", { reference });
  await audit(ctx, { action: "settlement.created", entity: "settlement", entityId: st.id, after: { reference, owedPaise: owed, settlementPaise: input.settlementPaise } });
  return { id: st.id, reference };
}

/** Editing is allowed in Draft and after a counter-proposal (S17); the next send is a new version, free. */
export async function updateSettlement(ctx: Ctx, id: string, raw: unknown) {
  const st = await loadSt(ctx, id);
  if (!SETTLEMENT_EDITABLE.includes(st.status)) throw new AppError("conflict", "Only drafts and settlements with a counter-proposal can be edited.");
  const { input, owed, counterpartyId, rows, today } = await validate(ctx, raw, st.id);
  if ((input.transactionId ?? null) !== st.transaction_id) throw new AppError("conflict", "The agreement being settled cannot change. Start a new settlement instead.");
  if (counterpartyId !== st.counterparty_id && st.sent_at) throw new AppError("conflict", "The debtor cannot change after the settlement was sent.");
  await sql()`
    update public.settlements
       set counterparty_id = ${counterpartyId}, outside_bill_no = ${st.transaction_id ? null : input.outsideBillNo ?? null},
           outside_bill_date = ${st.transaction_id ? null : input.outsideBillDate ?? null}, owed_paise = ${owed}, owed_on = ${today},
           settlement_paise = ${input.settlementPaise}, interest_agreed_paise = ${input.interestAgreedPaise},
           waived_paise = ${waivedPaise(owed, input.settlementPaise, input.interestAgreedPaise)}, mode = ${input.mode},
           grace_days = ${input.graceDays}, terms = ${input.terms}, status = 'draft'
     where id = ${id}`;
  await writeRows(st, rows);
  if (st.status === "counter_proposed") await sql()`update public.settlement_proposals set status = 'revised' where settlement_id = ${id} and status = 'open'`;
  await stEvent(st, await userActor(ctx), "edited", { settlementPaise: input.settlementPaise, mode: input.mode, instalments: rows.length });
  return { id };
}

/** "Accept proposal" (S17 rules): the debtor's amount and dates become the terms and are sent back for OTP acceptance. */
export async function adoptProposal(ctx: Ctx, id: string, proposalId: string, origin: string) {
  const st = await loadSt(ctx, id);
  if (st.status !== "counter_proposed") throw new AppError("conflict", "There is no open counter-proposal.");
  const [p] = await sql()<{ id: string; amount_paise: string; mode: SettlementMode; rows: Row[] }[]>`
    select id, amount_paise, mode, rows from public.settlement_proposals where id = ${proposalId} and settlement_id = ${id} and status = 'open'`;
  if (!p) throw new AppError("conflict", "This proposal is no longer open.");
  await updateSettlement(ctx, id, {
    transactionId: st.transaction_id ?? undefined, counterpartyId: st.counterparty_id, outsideBillNo: st.outside_bill_no ?? undefined,
    outsideBillDate: st.outside_bill_date ?? undefined, outsideOwedPaise: st.transaction_id ? undefined : Number(st.owed_paise),
    settlementPaise: Number(p.amount_paise), interestAgreedPaise: 0, mode: p.mode,
    fullDate: p.mode === "full" ? p.rows[0]?.dueDate : undefined, instalments: p.mode === "instalments" ? p.rows : [],
    graceDays: st.grace_days, terms: st.terms,
  });
  await sql()`update public.settlement_proposals set status = 'adopted' where id = ${p.id}`;
  await stEvent(st, await userActor(ctx), "proposal_adopted", { amountPaise: Number(p.amount_paise) });
  return sendSettlement(ctx, id, { channels: st.channels as ("sms" | "whatsapp" | "email")[], linkValidDays: st.link_valid_days, confirmed: true }, origin);
}

// ---------------------------------------------------------------- the document

export async function documentFor(st: StRow, acceptance?: SettlementDoc["acceptance"]): Promise<SettlementDoc> {
  const db = sql();
  const [[org], [cp], rows, original] = await Promise.all([
    db<{ name: string; gstin: string | null; address: { line1?: string; city?: string } | null; state_code: string | null }[]>`
      select coalesce(display_name, legal_name) as name, gstin, address, state_code from public.organisations where id = ${st.org_id}`,
    db<{ legal_name: string; gstin: string | null; address: { line1?: string; city?: string } | null }[]>`
      select legal_name, gstin, address from public.counterparties where id = ${st.counterparty_id}`,
    rowsFor(st.id),
    st.transaction_id ? db<{ reference: string }[]>`select reference from public.transactions where id = ${st.transaction_id}` : Promise.resolve([]),
  ]);
  const addr = (a: { line1?: string; city?: string } | null) => [a?.line1, a?.city].filter(Boolean).join(", ") || null;
  const base = st.link_base ?? process.env.APP_URL ?? "http://localhost:3400";
  return {
    reference: st.reference,
    version: st.version,
    creditor: { name: org.name, gstin: org.gstin, address: addr(org.address) },
    debtor: { name: cp.legal_name, gstin: cp.gstin, address: addr(cp.address) },
    original: { reference: original[0]?.reference ?? null, billNo: st.outside_bill_no, billDate: st.outside_bill_date },
    owedPaise: Number(st.owed_paise),
    owedOn: st.owed_on,
    settlementPaise: Number(st.settlement_paise),
    interestAgreedPaise: Number(st.interest_agreed_paise),
    waivedPaise: Number(st.waived_paise),
    mode: st.mode,
    rows: rows.map((r) => ({ dueDate: r.dueDate, amountPaise: r.amountPaise })),
    graceDays: st.grace_days,
    terms: st.terms,
    jurisdiction: (org.address?.city || (org.state_code ? GST_STATES[org.state_code] : null)) ?? "India",
    verifyUrl: `${base.replace(/\/$/, "")}/v/${st.reference}`,
    acceptance,
    generatedAt: acceptance?.at ?? new Date(),
  };
}

export async function sealedSettlementPdf(st: Pick<StRow, "id" | "reference">) {
  const [s] = await sql()<{ pdf_ref: string; version: number }[]>`
    select pdf_ref, version from public.settlement_seals where settlement_id = ${st.id} order by version desc limit 1`;
  if (!s) return null;
  return { bytes: await evidenceStore.get(s.pdf_ref), name: `${st.reference}-v${s.version}-sealed.pdf` };
}

export async function previewSettlementPdf(ctx: Ctx, id: string) {
  const st = await loadSt(ctx, id);
  return (await sealedSettlementPdf(st)) ?? { bytes: await settlementPdf(await documentFor(st)), name: `${st.reference}-v${st.version}-preview.pdf` };
}

// ---------------------------------------------------------------- send

export interface SettlementQuote {
  free: boolean;
  /** Price before GST, GST and the total taken from the wallet (v4: rupees only). */
  pricePaise: number;
  gstPaise: number;
  amountPaise: number;
  walletPaise: number;
  enough: boolean;
  channels: { sms: string; whatsapp: string; email: string | null };
}

/** S17 marker 5: ₹201 + GST from the wallet (v4: rupees only). Revised versions are free. */
export async function settlementQuote(ctx: Ctx, id: string): Promise<SettlementQuote> {
  const st = await loadSt(ctx, id);
  const [usage, summary, [cp]] = await Promise.all([
    priceList(ctx.orgId),
    billingSummary(ctx.orgId),
    sql()<{ mobile_masked: string; whatsapp_masked: string | null; email_masked: string | null }[]>`
      select mobile_masked, whatsapp_masked, email_masked from public.counterparties where id = ${st.counterparty_id}`,
  ]);
  const item = usage.find((u) => u.code === SETTLEMENT_ITEM);
  const free = Boolean(st.sent_at);
  const amount = free || !item ? 0 : Number(item.pricePaise) + Number(item.gstPaise);
  const wallet = Number(summary.walletPaise);
  return {
    free, amountPaise: amount, pricePaise: item ? Number(item.pricePaise) : 0, gstPaise: item ? Number(item.gstPaise) : 0,
    walletPaise: wallet, enough: free || wallet >= amount,
    channels: { sms: cp.mobile_masked, whatsapp: cp.whatsapp_masked ?? cp.mobile_masked, email: cp.email_masked },
  };
}

const inr = (paise: number) => `Rs ${(paise / 100).toLocaleString("en-IN")}`;

export const settlementLink = (st: Pick<StRow, "link_base" | "link_token_ciphertext">) =>
  `${st.link_base}/s/${decryptField(st.link_token_ciphertext!, "settlements.token")}`;

/** The link on the chosen channels. */
export async function sendSettlementLink(st: StRow, reminder: boolean) {
  const db = sql();
  const [[org], [cp]] = await Promise.all([
    db<{ name: string }[]>`select coalesce(display_name, legal_name) as name from public.organisations where id = ${st.org_id}`,
    db<{ mobile_ciphertext: string; whatsapp_ciphertext: string | null; email_ciphertext: string | null }[]>`
      select mobile_ciphertext, whatsapp_ciphertext, email_ciphertext from public.counterparties where id = ${st.counterparty_id}`,
  ]);
  const link = settlementLink(st);
  const toPay = Number(st.settlement_paise) + Number(st.interest_agreed_paise);
  const body = reminder
    ? `Reminder: the settlement offer from ${org.name} for ${inr(toPay)} is waiting for you: ${link}`
    : `${org.name} offered a settlement of ${inr(toPay)} ${st.mode === "full" ? "in one payment" : "in instalments"} on ChaanBean. Review and accept: ${link}`;
  const template = reminder ? "settlement_reminder" : "settlement_to_accept";
  const mobile = decryptField(cp.mobile_ciphertext, "counterparties.mobile");
  type Send = { channel: "sms" | "whatsapp" | "email"; recipientMasked: string; to: string; subject?: string };
  const sends = st.channels.flatMap((channel): Send[] => {
    if (channel === "sms") return [{ channel, recipientMasked: maskMobile(mobile), to: mobile }];
    if (channel === "whatsapp") {
      const wa = cp.whatsapp_ciphertext ? decryptField(cp.whatsapp_ciphertext, "counterparties.whatsapp") : mobile;
      return [{ channel, recipientMasked: maskMobile(wa), to: wa }];
    }
    if (channel === "email" && cp.email_ciphertext) {
      const email = decryptField(cp.email_ciphertext, "counterparties.email");
      return [{ channel, recipientMasked: maskEmail(email), to: email, subject: `${org.name}: settlement ${st.reference} to accept` }];
    }
    return [];
  });
  await Promise.all(sends.map((m) => queueMessage({ orgId: st.org_id, template, body, ...m })));
  return sends.map((m) => m.channel);
}

export async function sendSettlement(
  ctx: Ctx, id: string, input: { channels: ("sms" | "whatsapp" | "email")[]; linkValidDays: number; confirmed: true }, origin: string,
) {
  const st = await loadSt(ctx, id);
  if (st.status !== "draft") throw new AppError("conflict", st.status === "counter_proposed" ? "Revise the settlement first, then send it again." : "This settlement has already been sent.");
  const channels = [...new Set(input.channels)];
  if (!channels.length) throw new AppError("validation_failed", "Choose at least one channel.", { channels: "Choose at least one channel." });
  const [cp] = await sql()<{ email_ciphertext: string | null }[]>`select email_ciphertext from public.counterparties where id = ${st.counterparty_id}`;
  if (channels.includes("email") && !cp.email_ciphertext) throw new AppError("validation_failed", "This debtor has no email.", { channels: "This debtor has no email on file." });

  // What is owed moves every day with interest: check the terms still fit before sending.
  let owed = Number(st.owed_paise);
  if (st.transaction_id) {
    owed = (await overdueTx(ctx, st.transaction_id, st.id)).option.owedPaise;
    if (Number(st.settlement_paise) > owed) throw new AppError("conflict", "A payment was recorded since this settlement was drafted. Edit the amount first.");
  }
  const rows = await rowsFor(st.id);
  const today = istDate(new Date());
  if (rows[0] && rows[0].dueDate < today) throw new AppError("conflict", "The first payment date has passed. Edit the dates first.");

  const firstSend = !st.sent_at;
  const days = Math.min(TX_RULES.linkDaysMax, Math.max(TX_RULES.linkDaysMin, input.linkValidDays));
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  const version = firstSend ? st.version : st.version + 1;
  let holdId = st.hold_id;
  if (firstSend) {
    const hold = await placeHold({
      orgId: ctx.orgId, itemCode: SETTLEMENT_ITEM, refType: "settlement", refId: st.id, idempotencyKey: `st-send:${st.id}`,
      actorId: ctx.user.id, requestId: ctx.requestId, expiresAt: new Date(expiresAt.getTime() + 86_400_000),
    });
    holdId = hold.id;
  }
  const token = crypto.randomBytes(32).toString("base64url");
  const db = sql();
  const [sent] = await db<StRow[]>`
    update public.settlements
       set status = 'sent', version = ${version}, channels = ${channels}, link_valid_days = ${days}, link_token_hash = ${hashToken(token)},
           link_token_ciphertext = ${encryptField(token, "settlements.token")}, link_base = ${origin.replace(/\/$/, "")},
           link_expires_at = ${expiresAt}, hold_id = ${holdId}, sent_at = coalesce(sent_at, now()), viewed_at = null,
           reminded_day2_at = null, reminded_day5_at = null, owed_paise = ${owed}, owed_on = ${today},
           waived_paise = ${waivedPaise(owed, Number(st.settlement_paise), Number(st.interest_agreed_paise))}
     where id = ${st.id} and status = 'draft' returning ${stCols()}`;
  if (!sent) {
    if (firstSend && holdId) await reverseHold(ctx.orgId, holdId, "Settlement not sent", ctx.user.id, ctx.requestId);
    throw new AppError("conflict", "This settlement has already been sent.");
  }
  const doc = await documentFor(sent);
  await db`
    insert into public.settlement_versions (settlement_id, org_id, version, snapshot)
    values (${st.id}, ${ctx.orgId}, ${version}, ${db.json(doc as unknown as JSONValue)})
    on conflict (settlement_id, version) do nothing`;
  const delivered = await sendSettlementLink(sent, false);
  await stEvent(sent, await userActor(ctx), firstSend ? "sent" : "resent", { version, channels: delivered, linkValidDays: days });
  const sentAt = Date.now();
  await Promise.all([
    ...TX_RULES.reminderDays.map((d) =>
      enqueue("settlement.remind", { id: st.id, day: d, version }, { orgId: ctx.orgId, runAt: new Date(sentAt + d * 86_400_000), dedupeKey: `settlement.remind:${st.id}:${version}:${d}` }),
    ),
    enqueue("settlement.expire", { id: st.id, version }, { orgId: ctx.orgId, runAt: expiresAt, dedupeKey: `settlement.expire:${st.id}:${version}` }),
    audit(ctx, { action: firstSend ? "settlement.sent" : "settlement.resent", entity: "settlement", entityId: st.id, after: { version, channels } }),
  ]);
  return { id: st.id, status: "sent" as const };
}

export async function cancelSettlement(ctx: Ctx, id: string) {
  const st = await loadSt(ctx, id);
  if (!["draft", ...SETTLEMENT_AWAITING, "counter_proposed"].includes(st.status)) throw new AppError("conflict", "This settlement can no longer be cancelled.");
  const [done] = await sql()<StRow[]>`
    update public.settlements set status = 'cancelled', closed_at = now()
     where id = ${id} and status = ${st.status}::public.settlement_status returning ${stCols()}`;
  if (!done) throw new AppError("conflict", "This settlement changed. Please reload.");
  const unitBack = Boolean(st.hold_id && !st.viewed_at);
  if (st.hold_id && !st.viewed_at) await reverseHold(ctx.orgId, st.hold_id, "Settlement cancelled before it was opened. Money returned.", ctx.user.id, ctx.requestId);
  await stEvent(st, await userActor(ctx), "cancelled", { unitReturned: unitBack });
  await audit(ctx, { action: "settlement.cancelled", entity: "settlement", entityId: id });
  return { status: "cancelled" as const };
}

/** The link again while the debtor decides, or the sealed copy after. Once an hour. */
export async function resendSettlement(ctx: Ctx, id: string) {
  const st = await loadSt(ctx, id);
  const sealed = Boolean(st.sealed_at);
  if (!sealed && !SETTLEMENT_AWAITING.includes(st.status)) throw new AppError("conflict", "There is nothing to resend for this settlement.");
  const [recent] = await sql()`
    select 1 from public.settlement_events
     where settlement_id = ${id} and event in ('sent', 'resent', 'reminded', 'copy.resent') and at > now() - interval '1 hour' limit 1`;
  if (recent) throw new AppError("rate_limited", "It was sent less than an hour ago. Please try again later.");
  if (sealed) {
    await queueMessage({ orgId: st.org_id, channel: "whatsapp", ...(await counterpartyPhone(st.counterparty_id)), template: "settlement_sealed", body: `Settlement ${st.reference} is accepted and sealed. Download: ${settlementLink(st)}` });
  } else {
    await sendSettlementLink(st, true);
  }
  await stEvent(st, await userActor(ctx), "copy.resent", { sealed });
  return { sent: true };
}

export async function commitSettlementUnit(st: StRow) {
  if (st.hold_id) await commitHold(st.org_id, st.hold_id, "system", `st-view:${st.id}`).catch(() => undefined);
}

// ---------------------------------------------------------------- the schedule as it runs (FR-ES-05)

async function paymentsOf(settlementId: string) {
  return sql()<{ id: string; amount_paise: string; paid_on: string; mode: PaymentMode; reference: string | null; by: string | null; created_at: Date }[]>`
    select p.id, p.amount_paise, to_char(p.paid_on, 'YYYY-MM-DD') as paid_on, p.mode, p.reference, u.full_name as by, p.created_at
      from public.settlement_payments p left join public.user_profiles u on u.id = p.recorded_by
     where p.settlement_id = ${settlementId} order by p.paid_on, p.created_at`;
}

export async function stateOf(st: StRow, today = istDate(new Date())) {
  const [rows, payments] = await Promise.all([rowsFor(st.id), paymentsOf(st.id)]);
  return scheduleState(rows, payments.map((p) => ({ paidOn: p.paid_on, amountPaise: Number(p.amount_paise) })), today, st.grace_days);
}

/**
 * Keeps the instalment rows and the settlement status in step with the payments and today's date. A missed
 * instalment ends the settlement (default clause): the original agreement is Overdue again with its balance and
 * interest, less the payments made under the settlement (they were also recorded on it). The creditor is told.
 */
export async function refreshSchedule(st: StRow): Promise<SettlementStatus> {
  if (st.status !== "accepted") return st.status;
  const state = await stateOf(st);
  const db = sql();
  for (const i of state.instalments) {
    await db`
      update public.settlement_instalments
         set paid_paise = ${i.paidPaise}, status = ${i.status}::public.instalment_status, paid_on = ${i.paidOn},
             missed_at = case when ${i.status} = 'missed' then coalesce(missed_at, now()) else null end
       where settlement_id = ${st.id} and seq = ${i.seq}
         and (paid_paise <> ${i.paidPaise} or status <> ${i.status}::public.instalment_status)`;
  }
  if (state.outcome === "running") return st.status;
  const next = state.outcome === "completed" ? "completed" : "defaulted";
  const [moved] = await db<{ id: string }[]>`
    update public.settlements set status = ${next}::public.settlement_status, closed_at = now()
     where id = ${st.id} and status = 'accepted' returning id`;
  if (!moved) return next;
  const missed = state.instalments.find((i) => i.status === "missed");
  await stEvent(st, { type: "system" }, next === "completed" ? "completed" : "defaulted", next === "defaulted" ? { instalment: missed?.seq, dueDate: missed?.dueDate } : { paidPaise: state.paidPaise });
  if (next === "defaulted") {
    if (st.transaction_id) {
      const [tx] = await db<TxRow[]>`
        update public.transactions set status = 'overdue', closed_at = null where id = ${st.transaction_id} and status = 'settled' returning ${txCols()}`;
      if (tx) {
        await txEvent(tx, { type: "system" }, "settlement_defaulted", { reference: st.reference });
        await refreshRunning(tx);
      }
    }
    await tellUser(st.org_id, st.created_by, "settlement_defaulted", `Settlement ${st.reference} is in default`,
      `Instalment ${missed?.seq} of settlement ${st.reference} was not paid within ${st.grace_days} days of ${missed?.dueDate}. Under the default clause the original balance with interest is now due, less the payments made.`);
  } else {
    await tellUser(st.org_id, st.created_by, "settlement_completed", `Settlement ${st.reference} is fully paid`, `Every instalment of settlement ${st.reference} has been paid.`);
  }
  return next;
}

export async function recordSettlementPayment(
  ctx: Ctx, id: string, input: { amountPaise: number; paidOn: string; mode: PaymentMode; reference?: string; notify: boolean },
) {
  const st = await loadSt(ctx, id);
  if (st.status !== "accepted") throw new AppError("conflict", "Payments can be recorded once the settlement is accepted and until it ends.");
  const today = istDate(new Date());
  if (input.paidOn > today || input.paidOn < istDate(st.sealed_at ?? new Date())) throw new AppError("validation_failed", "Enter a valid payment date.", { paidOn: "Enter a valid payment date." });
  const state = await stateOf(st);
  if (input.amountPaise <= 0 || input.amountPaise > state.remainingPaise) {
    throw new AppError("validation_failed", "Amount is more than what is left to pay.", { amountPaise: "Amount is more than what is left to pay." });
  }
  // The same money is recorded on the agreement being settled, split interest first as usual (v3 8.6).
  let paymentId: string | null = null;
  if (st.transaction_id) {
    const [tx] = await sql()<TxRow[]>`select ${txCols()} from public.transactions where id = ${st.transaction_id}`;
    const before = await positionOf(tx, input.paidOn);
    const amount = Math.min(input.amountPaise, before.duePaise);
    if (amount > 0) {
      const toInterest = Math.min(amount, before.interestPaise);
      const [pay] = await sql()<{ id: string }[]>`
        insert into public.payments (transaction_id, org_id, amount_paise, interest_paise, principal_paise, paid_on, mode, reference, recorded_by)
        values (${tx.id}, ${ctx.orgId}, ${amount}, ${toInterest}, ${amount - toInterest}, ${input.paidOn}, ${input.mode}::public.payment_mode,
                ${input.reference ?? null}, ${ctx.user.id})
        returning id`;
      paymentId = pay.id;
      await txEvent(tx, await userActor(ctx), "payment.recorded", { amountPaise: amount, paidOn: input.paidOn, mode: input.mode, settlement: st.reference });
    }
  }
  const [p] = await sql()<{ id: string }[]>`
    insert into public.settlement_payments (settlement_id, org_id, amount_paise, paid_on, mode, reference, notify_counterparty, payment_id, recorded_by)
    values (${st.id}, ${ctx.orgId}, ${input.amountPaise}, ${input.paidOn}, ${input.mode}::public.payment_mode, ${input.reference ?? null},
            ${input.notify}, ${paymentId}, ${ctx.user.id})
    returning id`;
  await stEvent(st, await userActor(ctx), "payment.recorded", { amountPaise: input.amountPaise, paidOn: input.paidOn, mode: input.mode });
  const status = await refreshSchedule(st);
  if (input.notify) {
    const [[org], after] = await Promise.all([
      sql()<{ name: string }[]>`select coalesce(display_name, legal_name) as name from public.organisations where id = ${st.org_id}`,
      stateOf(st),
    ]);
    await queueMessage({
      orgId: st.org_id, channel: "whatsapp", ...(await counterpartyPhone(st.counterparty_id)), template: "settlement_payment_recorded",
      body: `${org.name} recorded a payment of ${inr(input.amountPaise)} against settlement ${st.reference}. Left to pay ${inr(after.remainingPaise)}.`,
    });
  }
  await audit(ctx, { action: "settlement.payment_recorded", entity: "settlement", entityId: st.id, after: { amountPaise: input.amountPaise, paidOn: input.paidOn, status } });
  return { id: p.id, status };
}

// ---------------------------------------------------------------- detail and list

export interface ProposalView {
  id: string;
  amountPaise: number;
  mode: SettlementMode;
  rows: Row[];
  comment: string | null;
  by: string | null;
  at: string;
}

export interface StView {
  id: string;
  reference: string;
  status: SettlementStatus;
  version: number;
  counterparty: { id: string; name: string; mobileMasked: string; emailMasked: string | null };
  original: { id: string; reference: string } | null;
  outside: { billNo: string; billDate: string } | null;
  owedPaise: number;
  owedOn: string;
  settlementPaise: number;
  interestAgreedPaise: number;
  waivedPaise: number;
  mode: SettlementMode;
  graceDays: number;
  terms: string;
  channels: string[];
  linkValidDays: number;
  linkExpiresAt: string | null;
  schedule: InstalmentState[];
  money: { toPayPaise: number; paidPaise: number; remainingPaise: number };
  next: InstalmentState | null;
  timeline: { step: "draft" | "sent" | "viewed" | "accepted" | "completed"; at: string | null }[];
  seal: { sha256: string; sealedAt: string; acceptedName: string; mobileMasked: string; otpRef: string; ip: string | null; device: string | null; verifyUrl: string } | null;
  lastDecision: { decision: "accept" | "reject" | "counter"; comment: string | null; at: string } | null;
  proposal: ProposalView | null;
  payments: { id: string; amountPaise: number; paidOn: string; mode: PaymentMode; reference: string | null; by: string | null }[];
  events: { at: string; actorType: string; actorName: string | null; event: string; detail: Record<string, unknown> }[];
}

export async function getSettlement(ctx: Ctx, id: string): Promise<StView> {
  let st = await loadSt(ctx, id);
  const status = await refreshSchedule(st);
  if (status !== st.status) st = await loadSt(ctx, id);
  const db = sql();
  const [[cp], original, seals, [decision], [proposal], payments, events, state] = await Promise.all([
    db<{ id: string; legal_name: string; mobile_masked: string; email_masked: string | null }[]>`
      select id, legal_name, mobile_masked, email_masked from public.counterparties where id = ${st.counterparty_id}`,
    st.transaction_id ? db<{ id: string; reference: string }[]>`select id, reference from public.transactions where id = ${st.transaction_id}` : Promise.resolve([]),
    db<{ sha256: string; sealed_at: Date; accepted_name: string; mobile_masked: string; otp_ref: string; ip: string | null; device: string | null }[]>`
      select sha256, sealed_at, accepted_name, mobile_masked, otp_ref, host(ip) as ip, device from public.settlement_seals
       where settlement_id = ${id} order by version desc limit 1`,
    db<{ decision: "accept" | "reject" | "counter"; comment: string | null; decided_at: Date }[]>`
      select decision, comment, decided_at from public.settlement_decisions where settlement_id = ${id} order by decided_at desc limit 1`,
    db<{ id: string; amount_paise: string; mode: SettlementMode; rows: Row[]; comment: string | null; proposed_by: string | null; created_at: Date }[]>`
      select id, amount_paise, mode, rows, comment, proposed_by, created_at from public.settlement_proposals
       where settlement_id = ${id} and status = 'open' order by created_at desc limit 1`,
    paymentsOf(id),
    db<{ at: Date; actor_type: string; actor_name: string | null; event: string; detail: Record<string, unknown> }[]>`
      select at, actor_type, actor_name, event, detail from public.settlement_events where settlement_id = ${id} order by at desc, id desc`,
    stateOf(st),
  ]);
  const base = (st.link_base ?? process.env.APP_URL ?? "http://localhost:3400").replace(/\/$/, "");
  const toPay = Number(st.settlement_paise) + Number(st.interest_agreed_paise);
  return {
    id: st.id,
    reference: st.reference,
    status: st.status,
    version: st.version,
    counterparty: { id: cp.id, name: cp.legal_name, mobileMasked: cp.mobile_masked, emailMasked: cp.email_masked },
    original: original[0] ?? null,
    outside: st.outside_bill_no && st.outside_bill_date ? { billNo: st.outside_bill_no, billDate: st.outside_bill_date } : null,
    owedPaise: Number(st.owed_paise),
    owedOn: st.owed_on,
    settlementPaise: Number(st.settlement_paise),
    interestAgreedPaise: Number(st.interest_agreed_paise),
    waivedPaise: Number(st.waived_paise),
    mode: st.mode,
    graceDays: st.grace_days,
    terms: st.terms,
    channels: st.channels,
    linkValidDays: st.link_valid_days,
    linkExpiresAt: st.link_expires_at?.toISOString() ?? null,
    schedule: state.instalments,
    money: { toPayPaise: toPay, paidPaise: state.paidPaise, remainingPaise: state.remainingPaise },
    next: st.status === "accepted" ? state.next : null,
    timeline: [
      { step: "draft", at: st.created_at.toISOString() },
      { step: "sent", at: st.sent_at?.toISOString() ?? null },
      { step: "viewed", at: st.viewed_at?.toISOString() ?? null },
      { step: "accepted", at: st.sealed_at?.toISOString() ?? null },
      { step: "completed", at: st.status === "completed" ? st.closed_at?.toISOString() ?? null : null },
    ],
    seal: seals[0]
      ? {
          sha256: seals[0].sha256, sealedAt: seals[0].sealed_at.toISOString(), acceptedName: seals[0].accepted_name, mobileMasked: seals[0].mobile_masked,
          otpRef: seals[0].otp_ref, ip: seals[0].ip, device: seals[0].device, verifyUrl: `${base}/v/${st.reference}`,
        }
      : null,
    lastDecision: decision ? { decision: decision.decision, comment: decision.comment, at: decision.decided_at.toISOString() } : null,
    proposal: proposal && st.status === "counter_proposed"
      ? { id: proposal.id, amountPaise: Number(proposal.amount_paise), mode: proposal.mode, rows: proposal.rows, comment: proposal.comment, by: proposal.proposed_by, at: proposal.created_at.toISOString() }
      : null,
    payments: payments.map((p) => ({ id: p.id, amountPaise: Number(p.amount_paise), paidOn: p.paid_on, mode: p.mode, reference: p.reference, by: p.by })),
    events: events.map((e) => ({ at: e.at.toISOString(), actorType: e.actor_type, actorName: e.actor_name, event: e.event, detail: e.detail })),
  };
}

export async function listSettlements(ctx: Ctx, filter: { counterpartyId?: string; transactionId?: string } = {}) {
  const db = sql();
  const rows = await db<{ id: string; reference: string; status: SettlementStatus; mode: SettlementMode; legal_name: string; counterparty_id: string;
    tx_reference: string | null; transaction_id: string | null; outside_bill_no: string | null; settlement_paise: string; interest_agreed_paise: string;
    instalments: number; next_due: string | null; created_at: Date }[]>`
    select s.id, s.reference, s.status, s.mode, c.legal_name, s.counterparty_id, t.reference as tx_reference, s.transaction_id, s.outside_bill_no,
           s.settlement_paise, s.interest_agreed_paise,
           (select count(*)::int from public.settlement_instalments i where i.settlement_id = s.id) as instalments,
           (select to_char(min(i.due_date), 'YYYY-MM-DD') from public.settlement_instalments i where i.settlement_id = s.id and i.status = 'due') as next_due,
           s.created_at
      from public.settlements s
      join public.counterparties c on c.id = s.counterparty_id
      left join public.transactions t on t.id = s.transaction_id
     where s.org_id = ${ctx.orgId}
       ${filter.counterpartyId ? db`and s.counterparty_id = ${filter.counterpartyId}` : db``}
       ${filter.transactionId ? db`and s.transaction_id = ${filter.transactionId}` : db``}
     order by s.created_at desc limit 200`;
  return rows.map((r) => ({
    id: r.id, reference: r.reference, status: r.status, mode: r.mode, counterparty: { id: r.counterparty_id, name: r.legal_name },
    original: r.transaction_id ? { id: r.transaction_id, reference: r.tx_reference! } : null, outsideBillNo: r.outside_bill_no,
    toPayPaise: Number(r.settlement_paise) + Number(r.interest_agreed_paise), instalments: r.instalments,
    nextDue: ["accepted"].includes(r.status) ? r.next_due : null, createdAt: r.created_at.toISOString(),
  }));
}

/** When an instalment is due (09:00 IST, FR-ES-05) and when it counts as missed (00:30 IST after the grace days). */
export const instalmentDueAt = (dueDate: string) => istInstant(dueDate, "09:00");
export const instalmentCheckAt = (dueDate: string, graceDays: number) => istInstant(addDays(dueDate, graceDays + 1), "00:30");
