import "server-only";
import crypto from "node:crypto";
import type { JSONValue } from "postgres";
import { istDate, istInstant } from "@/lib/dates";
import { maskEmail, maskMobile } from "@/lib/mask";
import {
  AWAITING_STATUSES, ITEM_CODE, OPEN_STATUSES, TX_RULES, daysBetweenDates, draftProblems, draftSchema, position, runningStatus,
  totals, type ItemLine, type PaymentMode, type TxStatus, type TxType,
} from "@/lib/transactions";
import { audit } from "@/server/audit";
import { billingSummary, priceList } from "@/server/billing/service";
import { commitHold, placeHold, reverseHold } from "@/server/billing/charge";
import { decryptField, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { enqueue } from "@/server/jobs/runner";
import { queueMessage } from "@/server/outbox";
import { agreementPdf, type AgreementDoc } from "@/server/pdf/agreement";
import { GST_STATES } from "@/server/providers/identity/states";
import { evidenceStore } from "@/server/storage";
import type { RequestContext } from "@/server/context";

// Business Security agreements, the user's side (PRD v3.0 8.1–8.6; v1.0 S13, S14, S16, FR-TX-01–10).
// Draft → send (the wallet charge, held until the counterparty opens the link) → the counterparty accepts by OTP on the
// public page (src/server/transactions/public.ts) → sealed → running until paid. Payments pay accrued interest first.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

export interface TxRow {
  id: string; org_id: string; counterparty_id: string; reference: string; type: TxType; status: TxStatus; version: number;
  invoice_no: string | null; invoice_date: string; place_of_supply: string | null; total_paise: string; paid_now_paise: string;
  principal_paise: string | null; due_date: string; interest_bp: number; terms: string; channels: string[]; link_valid_days: number;
  link_token_hash: string | null; link_token_ciphertext: string | null; link_base: string | null; link_expires_at: Date | null;
  hold_id: string | null; sent_at: Date | null; viewed_at: Date | null; decided_at: Date | null; sealed_at: Date | null;
  closed_at: Date | null; created_by: string | null; created_at: Date;
}

export const txCols = () => sql()`id, org_id, counterparty_id, reference, type, status, version, invoice_no,
  to_char(invoice_date, 'YYYY-MM-DD') as invoice_date, place_of_supply, total_paise, paid_now_paise, principal_paise,
  to_char(due_date, 'YYYY-MM-DD') as due_date, interest_bp, terms, channels, link_valid_days, link_token_hash,
  link_token_ciphertext, link_base, link_expires_at, hold_id, sent_at, viewed_at, decided_at, sealed_at, closed_at,
  created_by, created_at`;

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Writes one line of the activity log (S16 marker 6). */
export async function txEvent(
  tx: Pick<TxRow, "id" | "org_id">,
  actor: { type: "user" | "counterparty" | "system"; id?: string | null; name?: string | null },
  event: string,
  detail: Record<string, unknown> = {},
) {
  await sql()`
    insert into public.transaction_events (transaction_id, org_id, actor_type, actor_id, actor_name, event, detail)
    values (${tx.id}, ${tx.org_id}, ${actor.type}, ${actor.id ?? null}, ${actor.name ?? null}, ${event}, ${sql().json(detail as JSONValue)})`;
}

/** The counterparty's WhatsApp number (or mobile), for a message: masked for the record, full for the sender. */
export async function counterpartyPhone(counterpartyId: string) {
  const [cp] = await sql()<{ mobile_ciphertext: string; whatsapp_ciphertext: string | null }[]>`
    select mobile_ciphertext, whatsapp_ciphertext from public.counterparties where id = ${counterpartyId}`;
  const to = cp.whatsapp_ciphertext ? decryptField(cp.whatsapp_ciphertext, "counterparties.whatsapp") : decryptField(cp.mobile_ciphertext, "counterparties.mobile");
  return { to, recipientMasked: maskMobile(to) };
}

/** The person who created a deal: email if they have one, else WhatsApp on their sign-in mobile (T09, T11). */
export async function tellUser(orgId: string, userId: string | null, template: string, subject: string, body: string) {
  if (!userId) return;
  const [u] = await sql()<{ email: string | null; phone: string | null }[]>`
    select p.email, u.phone from auth.users u left join public.user_profiles p on p.id = u.id where u.id = ${userId}::uuid`;
  if (u?.email) await queueMessage({ orgId, channel: "email", recipientMasked: maskEmail(u.email), to: u.email, template, subject, body });
  else if (u?.phone) await queueMessage({ orgId, channel: "whatsapp", recipientMasked: maskMobile(u.phone.slice(-10)), to: u.phone.slice(-10), template, body });
}

const userActor = async (ctx: Ctx) => {
  const [p] = await sql()<{ full_name: string | null }[]>`select full_name from public.user_profiles where id = ${ctx.user.id}`;
  return { type: "user" as const, id: ctx.user.id, name: p?.full_name ?? null };
};

async function loadTx(ctx: Ctx, id: string): Promise<TxRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("This agreement");
  const [tx] = await sql()<TxRow[]>`select ${txCols()} from public.transactions where id = ${id} and org_id = ${ctx.orgId}`;
  if (!tx) throw notFound("This agreement");
  return tx;
}

// ---------------------------------------------------------------- draft (S13)

interface CpRow { id: string; legal_name: string; status: string; gstin: string | null; mobile_masked: string | null; email_masked: string | null; upi_status: string }

async function checkCounterparty(ctx: Ctx, id: string): Promise<CpRow> {
  const [cp] = await sql()<CpRow[]>`
    select id, legal_name, status::text as status, gstin, mobile_masked, email_masked, upi_status::text as upi_status
      from public.counterparties where id = ${id} and org_id = ${ctx.orgId}`;
  if (!cp) throw new AppError("validation_failed", "Select a counterparty.", { counterpartyId: "Select a counterparty with a mobile number." });
  if (cp.status !== "active") throw new AppError("validation_failed", "This counterparty is archived.", { counterpartyId: "This counterparty is archived. Restore them first." });
  if (!cp.mobile_masked) throw new AppError("validation_failed", "Add the buyer's contact first.", { counterpartyId: "Add a contact name and mobile to this buyer first." });
  return cp;
}

function validate(raw: unknown) {
  const input = draftSchema.parse(raw);
  const problems = draftProblems(input, istDate(new Date()));
  if (Object.keys(problems).length) throw new AppError("validation_failed", "Please check the highlighted fields.", problems);
  const t = totals(input.items);
  const total = input.type === "lender" ? input.principalPaise! : t.totalPaise;
  return { input, lines: t.lines, total };
}

async function writeItems(db: ReturnType<typeof sql>, txId: string, orgId: string, lines: ItemLine[]) {
  await db`delete from public.transaction_items where transaction_id = ${txId}`;
  if (!lines.length) return;
  await db`insert into public.transaction_items ${db(
    lines.map((l, i) => ({
      transaction_id: txId, org_id: orgId, line: i + 1, product: l.product, hsn: l.hsn ?? null, qty: l.qty, unit: l.unit,
      rate_paise: l.ratePaise, gst_bp: l.gstBp, taxable_paise: l.taxablePaise, gst_paise: l.gstPaise, amount_paise: l.amountPaise,
    })),
  )}`;
}

const invoiceTaken = (e: unknown) =>
  (e as { code?: string; constraint_name?: string }).code === "23505" && (e as { constraint_name?: string }).constraint_name === "transactions_invoice_unique";

export async function createDraft(ctx: Ctx, raw: unknown) {
  const { input, lines, total } = validate(raw);
  const cp = await checkCounterparty(ctx, input.counterpartyId);
  const db = sql();
  const [{ reference }] = await db<{ reference: string }[]>`select app_private.next_reference('CHB-TX') as reference`;
  let tx: TxRow;
  try {
    [tx] = await db<TxRow[]>`
      insert into public.transactions (org_id, counterparty_id, reference, type, invoice_no, invoice_date, place_of_supply,
        total_paise, paid_now_paise, principal_paise, due_date, interest_bp, terms, created_by)
      values (${ctx.orgId}, ${cp.id}, ${reference}, ${input.type}, ${input.invoiceNo ?? null}, ${input.invoiceDate},
        ${input.type === "lender" ? null : input.placeOfSupply ?? null}, ${total}, ${input.paidNowPaise},
        ${input.type === "lender" ? input.principalPaise! : null}, ${input.dueDate}, ${input.interestBp}, ${input.terms}, ${ctx.user.id})
      returning ${txCols()}`;
  } catch (e) {
    if (invoiceTaken(e)) throw new AppError("validation_failed", "This invoice number is already used.", { invoiceNo: "This invoice number is already used for this counterparty." });
    throw e;
  }
  await writeItems(db, tx.id, ctx.orgId, lines);
  await txEvent(tx, await userActor(ctx), "created", { type: input.type, totalPaise: total });
  await audit(ctx, { action: "transaction.created", entity: "transaction", entityId: tx.id, after: { reference, type: input.type, totalPaise: total } });
  return { id: tx.id, reference, warning: cp.upi_status !== "linked" ? "notBankLinked" : null };
}

/** Editing is allowed in Draft and after the counterparty asked for changes (v3 8.6); the next send is a new version. */
export async function updateDraft(ctx: Ctx, id: string, raw: unknown) {
  const tx = await loadTx(ctx, id);
  if (tx.status !== "draft" && tx.status !== "changes_requested") throw new AppError("conflict", "Only drafts and agreements with a change request can be edited.");
  const { input, lines, total } = validate(raw);
  if (input.counterpartyId !== tx.counterparty_id && tx.sent_at) throw new AppError("conflict", "The counterparty cannot change after the agreement was sent.");
  await checkCounterparty(ctx, input.counterpartyId);
  const db = sql();
  try {
    await db`
      update public.transactions
         set counterparty_id = ${input.counterpartyId}, type = ${input.type}, invoice_no = ${input.invoiceNo ?? null},
             invoice_date = ${input.invoiceDate}, place_of_supply = ${input.type === "lender" ? null : input.placeOfSupply ?? null},
             total_paise = ${total}, paid_now_paise = ${input.paidNowPaise}, principal_paise = ${input.type === "lender" ? input.principalPaise! : null},
             due_date = ${input.dueDate}, interest_bp = ${input.interestBp}, terms = ${input.terms}, status = 'draft'
       where id = ${id}`;
  } catch (e) {
    if (invoiceTaken(e)) throw new AppError("validation_failed", "This invoice number is already used.", { invoiceNo: "This invoice number is already used for this counterparty." });
    throw e;
  }
  await writeItems(db, id, ctx.orgId, lines);
  await txEvent(tx, await userActor(ctx), "edited", { totalPaise: total });
  return { id };
}

// ---------------------------------------------------------------- the document

const orgParty = async (orgId: string) => {
  const [o] = await sql()<{ name: string; gstin: string | null; address: { line1?: string; city?: string } | null; state_code: string | null }[]>`
    select coalesce(display_name, legal_name) as name, gstin, address, state_code from public.organisations where id = ${orgId}`;
  return o;
};

/** Builds the agreement document for a transaction: the preview, or the sealed copy when `acceptance` is given. */
export async function documentFor(tx: TxRow, acceptance?: AgreementDoc["acceptance"]): Promise<AgreementDoc> {
  const db = sql();
  const [org, [cp], items] = await Promise.all([
    orgParty(tx.org_id),
    db<{ legal_name: string; gstin: string | null; address: { line1?: string; city?: string } | null }[]>`
      select legal_name, gstin, address from public.counterparties where id = ${tx.counterparty_id}`,
    db<{ product: string; hsn: string | null; qty: string; unit: string; rate_paise: string; gst_bp: number; taxable_paise: string; gst_paise: string; amount_paise: string }[]>`
      select product, hsn, qty, unit, rate_paise, gst_bp, taxable_paise, gst_paise, amount_paise
        from public.transaction_items where transaction_id = ${tx.id} order by line`,
  ]);
  const addr = (a: { line1?: string; city?: string } | null) => [a?.line1, a?.city].filter(Boolean).join(", ") || null;
  const base = tx.link_base ?? process.env.APP_URL ?? "http://localhost:3400";
  return {
    reference: tx.reference,
    version: tx.version,
    type: tx.type,
    creator: { name: org.name, gstin: org.gstin, address: addr(org.address) },
    counterparty: { name: cp.legal_name, gstin: cp.gstin, address: addr(cp.address) },
    invoiceNo: tx.invoice_no,
    invoiceDate: tx.invoice_date,
    placeOfSupply: tx.place_of_supply ? (GST_STATES[tx.place_of_supply] ?? tx.place_of_supply) : null,
    items: items.map((i) => ({
      product: i.product, hsn: i.hsn ?? undefined, qty: Number(i.qty), unit: i.unit, ratePaise: Number(i.rate_paise), gstBp: i.gst_bp,
      taxablePaise: Number(i.taxable_paise), gstPaise: Number(i.gst_paise), amountPaise: Number(i.amount_paise),
    })),
    totalPaise: Number(tx.total_paise),
    paidNowPaise: Number(tx.paid_now_paise),
    dueDate: tx.due_date,
    interestBp: tx.interest_bp,
    terms: tx.terms,
    jurisdiction: (org.address?.city || (org.state_code ? GST_STATES[org.state_code] : null)) ?? "India",
    verifyUrl: `${base.replace(/\/$/, "")}/v/${tx.reference}`,
    acceptance,
    generatedAt: acceptance?.at ?? new Date(),
  };
}

/** S14 marker 1: the exact agreement the counterparty will see (marked PREVIEW until accepted). */
export async function previewPdf(ctx: Ctx, id: string) {
  const tx = await loadTx(ctx, id);
  const seal = await sealedPdf(tx);
  return seal ?? { bytes: await agreementPdf(await documentFor(tx)), name: `${tx.reference}-v${tx.version}-preview.pdf` };
}

/** The sealed copy, read back from the write-once store (its hash is re-checked on every read). */
export async function sealedPdf(tx: Pick<TxRow, "id" | "reference">) {
  const [s] = await sql()<{ pdf_ref: string; version: number }[]>`
    select pdf_ref, version from public.transaction_seals where transaction_id = ${tx.id} order by version desc limit 1`;
  if (!s) return null;
  return { bytes: await evidenceStore.get(s.pdf_ref), name: `${tx.reference}-v${s.version}-sealed.pdf` };
}

// ---------------------------------------------------------------- send (S14)

export interface SendQuote {
  /** Resending after a change request is free (v3 section 10). */
  free: boolean;
  /** Price before GST, GST and the total taken from the wallet (v4: rupees only). */
  pricePaise: number;
  gstPaise: number;
  amountPaise: number;
  walletPaise: number;
  enough: boolean;
  channels: { sms: string; whatsapp: string; email: string | null };
}

export async function sendQuote(ctx: Ctx, id: string): Promise<SendQuote> {
  const tx = await loadTx(ctx, id);
  const [usage, summary, [cp]] = await Promise.all([
    priceList(ctx.orgId),
    billingSummary(ctx.orgId),
    sql()<{ mobile_masked: string; whatsapp_masked: string | null; email_masked: string | null }[]>`
      select mobile_masked, whatsapp_masked, email_masked from public.counterparties where id = ${tx.counterparty_id}`,
  ]);
  const item = usage.find((u) => u.code === ITEM_CODE[tx.type]);
  const free = Boolean(tx.sent_at);
  const amount = free || !item ? 0 : Number(item.pricePaise) + Number(item.gstPaise);
  const wallet = Number(summary.walletPaise);
  return {
    free, amountPaise: amount, pricePaise: item ? Number(item.pricePaise) : 0, gstPaise: item ? Number(item.gstPaise) : 0,
    walletPaise: wallet, enough: free || wallet >= amount,
    channels: { sms: cp.mobile_masked, whatsapp: cp.whatsapp_masked ?? cp.mobile_masked, email: cp.email_masked },
  };
}

const LINK_MESSAGES: Record<TxType, string> = {
  seller: "shared a supply on credit agreement",
  buyer: "shared an advance payment agreement",
  lender: "shared a loan agreement",
};

/** Sends the link on the chosen channels (T07, T08). */
export async function sendLink(tx: TxRow, reminder: boolean) {
  const db = sql();
  const [[org], [cp]] = await Promise.all([
    db<{ name: string }[]>`select coalesce(display_name, legal_name) as name from public.organisations where id = ${tx.org_id}`,
    db<{ mobile_ciphertext: string; whatsapp_ciphertext: string | null; email_ciphertext: string | null }[]>`
      select mobile_ciphertext, whatsapp_ciphertext, email_ciphertext from public.counterparties where id = ${tx.counterparty_id}`,
  ]);
  const link = `${tx.link_base}/a/${decryptField(tx.link_token_ciphertext!, "transactions.token")}`;
  const balance = Number(tx.total_paise) - Number(tx.paid_now_paise);
  const amount = `Rs ${(balance / 100).toLocaleString("en-IN")}`;
  const body = reminder
    ? `Reminder: the agreement from ${org.name} for ${amount} is waiting for you: ${link}`
    : `${org.name} ${LINK_MESSAGES[tx.type]} for ${amount} due ${tx.due_date} on ChaanBean. Review and accept: ${link}`;
  const template = reminder ? "agreement_reminder" : "agreement_to_accept";
  const mobile = decryptField(cp.mobile_ciphertext, "counterparties.mobile");
  type Send = { channel: "sms" | "whatsapp" | "email"; recipientMasked: string; to: string; subject?: string };
  const sends = tx.channels.flatMap((channel): Send[] => {
    if (channel === "sms") return [{ channel, recipientMasked: maskMobile(mobile), to: mobile }];
    if (channel === "whatsapp") {
      const wa = cp.whatsapp_ciphertext ? decryptField(cp.whatsapp_ciphertext, "counterparties.whatsapp") : mobile;
      return [{ channel, recipientMasked: maskMobile(wa), to: wa }];
    }
    if (channel === "email" && cp.email_ciphertext) {
      const email = decryptField(cp.email_ciphertext, "counterparties.email");
      return [{ channel, recipientMasked: maskEmail(email), to: email, subject: `${org.name}: agreement ${tx.reference} to accept` }];
    }
    return [];
  });
  await Promise.all(sends.map((m) => queueMessage({ orgId: tx.org_id, template, body, ...m })));
  return sends.map((m) => m.channel);
}

export async function sendTransaction(
  ctx: Ctx, id: string, input: { channels: ("sms" | "whatsapp" | "email")[]; linkValidDays: number; confirmed: true }, origin: string,
) {
  const tx = await loadTx(ctx, id);
  if (tx.status !== "draft") throw new AppError("conflict", tx.status === "changes_requested" ? "Edit the agreement first, then send it again." : "This agreement has already been sent.");
  const channels = [...new Set(input.channels)];
  if (!channels.length) throw new AppError("validation_failed", "Choose at least one channel.", { channels: "Choose at least one channel." });
  const [cp] = await sql()<{ email_ciphertext: string | null; status: string }[]>`
    select email_ciphertext, status::text as status from public.counterparties where id = ${tx.counterparty_id}`;
  if (channels.includes("email") && !cp.email_ciphertext) throw new AppError("validation_failed", "This counterparty has no email.", { channels: "This counterparty has no email on file." });
  const firstSend = !tx.sent_at;
  const days = Math.min(TX_RULES.linkDaysMax, Math.max(TX_RULES.linkDaysMin, input.linkValidDays));
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  const version = firstSend ? tx.version : tx.version + 1;

  // The send charge is held on first send, until the counterparty opens the link (v3 section 10).
  let holdId = tx.hold_id;
  if (firstSend) {
    const hold = await placeHold({
      orgId: ctx.orgId, itemCode: ITEM_CODE[tx.type], refType: "transaction", refId: tx.id, idempotencyKey: `tx-send:${tx.id}`,
      actorId: ctx.user.id, requestId: ctx.requestId, expiresAt: new Date(expiresAt.getTime() + 86_400_000),
    });
    holdId = hold.id;
  }
  const token = crypto.randomBytes(32).toString("base64url");
  const db = sql();
  const doc = await documentFor({ ...tx, version });
  const [sent] = await db<TxRow[]>`
    update public.transactions
       set status = 'sent', version = ${version}, channels = ${channels}, link_valid_days = ${days}, link_token_hash = ${hashToken(token)},
           link_token_ciphertext = ${encryptField(token, "transactions.token")}, link_base = ${origin.replace(/\/$/, "")},
           link_expires_at = ${expiresAt}, hold_id = ${holdId}, sent_at = coalesce(sent_at, now()), viewed_at = null,
           reminded_day2_at = null, reminded_day5_at = null
     where id = ${tx.id} and status = 'draft' returning ${txCols()}`;
  if (!sent) {
    if (firstSend && holdId) await reverseHold(ctx.orgId, holdId, "Agreement not sent", ctx.user.id, ctx.requestId);
    throw new AppError("conflict", "This agreement has already been sent.");
  }
  await db`
    insert into public.transaction_versions (transaction_id, org_id, version, snapshot)
    values (${tx.id}, ${ctx.orgId}, ${version}, ${db.json(doc as unknown as JSONValue)})
    on conflict (transaction_id, version) do nothing`;
  const delivered = await sendLink(sent, false);
  await txEvent(sent, await userActor(ctx), firstSend ? "sent" : "resent", { version, channels: delivered, linkValidDays: days });
  const sentAt = Date.now();
  await Promise.all([
    ...TX_RULES.reminderDays.map((d) =>
      enqueue("transaction.remind", { id: tx.id, day: d, version }, { orgId: ctx.orgId, runAt: new Date(sentAt + d * 86_400_000), dedupeKey: `transaction.remind:${tx.id}:${version}:${d}` }),
    ),
    enqueue("transaction.expire", { id: tx.id, version }, { orgId: ctx.orgId, runAt: expiresAt, dedupeKey: `transaction.expire:${tx.id}:${version}` }),
    audit(ctx, { action: firstSend ? "transaction.sent" : "transaction.resent", entity: "transaction", entityId: tx.id, after: { version, channels } }),
  ]);
  return { id: tx.id, status: "sent" as const };
}

/** Cancel before acceptance (v3 8.6). Before the link is opened the unit comes back. */
export async function cancelTransaction(ctx: Ctx, id: string) {
  const tx = await loadTx(ctx, id);
  if (!["draft", ...AWAITING_STATUSES, "changes_requested"].includes(tx.status)) throw new AppError("conflict", "This agreement can no longer be cancelled.");
  const [done] = await sql()<TxRow[]>`
    update public.transactions set status = 'cancelled', closed_at = now()
     where id = ${id} and status = ${tx.status}::public.transaction_status returning ${txCols()}`;
  if (!done) throw new AppError("conflict", "This agreement changed. Please reload.");
  if (tx.hold_id && !tx.viewed_at) await reverseHold(ctx.orgId, tx.hold_id, "Agreement cancelled before it was opened. Money returned.", ctx.user.id, ctx.requestId);
  await txEvent(tx, await userActor(ctx), "cancelled", { unitReturned: Boolean(tx.hold_id && !tx.viewed_at) });
  await audit(ctx, { action: "transaction.cancelled", entity: "transaction", entityId: id });
  return { status: "cancelled" as const };
}

/** S16 "Resend copy to counterparty": the link again while they decide, or the sealed copy after. Once an hour. */
export async function resendToCounterparty(ctx: Ctx, id: string) {
  const tx = await loadTx(ctx, id);
  const sealed = Boolean(tx.sealed_at);
  if (!sealed && !AWAITING_STATUSES.includes(tx.status)) throw new AppError("conflict", "There is nothing to resend for this agreement.");
  const [recent] = await sql()`
    select 1 from public.transaction_events
     where transaction_id = ${id} and event in ('sent', 'resent', 'reminded', 'copy.resent') and at > now() - interval '1 hour' limit 1`;
  if (recent) throw new AppError("rate_limited", "It was sent less than an hour ago. Please try again later.");
  if (sealed) {
    const cp = await counterpartyPhone(tx.counterparty_id);
    const link = `${tx.link_base}/a/${decryptField(tx.link_token_ciphertext!, "transactions.token")}`;
    await queueMessage({ orgId: tx.org_id, channel: "whatsapp", ...cp, template: "agreement_sealed", body: `Agreement ${tx.reference} is accepted and sealed. Download: ${link}` });
  } else {
    await sendLink(tx, true);
  }
  await txEvent(tx, await userActor(ctx), "copy.resent", { sealed });
  return { sent: true };
}

/** Called when the counterparty first opens the link: the unit is now used (v3 section 10). */
export async function commitSendUnit(tx: TxRow) {
  if (tx.hold_id) await commitHold(tx.org_id, tx.hold_id, "system", `tx-view:${tx.id}`).catch(() => undefined);
}

// ---------------------------------------------------------------- payments (S16 marker 4)

interface PaymentRow { amount_paise: string; paid_on: string }

export async function positionOf(tx: TxRow, today = istDate(new Date())) {
  const payments = await sql()<PaymentRow[]>`
    select amount_paise, to_char(paid_on, 'YYYY-MM-DD') as paid_on from public.payments where transaction_id = ${tx.id} order by paid_on, created_at`;
  const p = position({
    openingPaise: Number(tx.total_paise) - Number(tx.paid_now_paise),
    dueDate: tx.due_date,
    rateBp: tx.interest_bp,
    payments: payments.map((x) => ({ paidOn: x.paid_on, amountPaise: Number(x.amount_paise) })),
    today,
  });
  return { ...p, payments: payments.length };
}

/** Moves a running deal to Partially paid, Overdue or Paid from its numbers. */
export async function refreshRunning(tx: TxRow) {
  if (!OPEN_STATUSES.includes(tx.status)) return tx.status;
  const today = istDate(new Date());
  const p = await positionOf(tx, today);
  const next = runningStatus(p, p.payments > 0, tx.due_date, today);
  if (next !== tx.status) {
    await sql()`
      update public.transactions set status = ${next}::public.transaction_status, closed_at = ${next === "paid" ? sql()`now()` : null}
       where id = ${tx.id} and status = ${tx.status}::public.transaction_status`;
    await txEvent(tx, { type: "system" }, `status.${next}`, { duePaise: p.duePaise, daysOverdue: p.daysOverdue });
  }
  return next;
}

export async function recordPayment(
  ctx: Ctx, id: string, input: { amountPaise: number; paidOn: string; mode: PaymentMode; reference?: string; notify: boolean },
) {
  const tx = await loadTx(ctx, id);
  if (!OPEN_STATUSES.includes(tx.status)) throw new AppError("conflict", "Payments can be recorded once the agreement is sealed and until it is paid.");
  const today = istDate(new Date());
  if (input.paidOn > today || input.paidOn < tx.invoice_date) throw new AppError("validation_failed", "Enter a valid payment date.", { paidOn: "Enter a valid payment date." });
  const before = await positionOf(tx, input.paidOn);
  if (input.amountPaise <= 0 || input.amountPaise > before.duePaise) {
    throw new AppError("validation_failed", "Amount is more than what is due.", { amountPaise: "Amount is more than what is due." });
  }
  // Interest first, then principal, worked out on the payment date with every earlier payment.
  const toInterest = Math.min(input.amountPaise, before.interestPaise);
  const [pay] = await sql()<{ id: string }[]>`
    insert into public.payments (transaction_id, org_id, amount_paise, interest_paise, principal_paise, paid_on, mode, reference,
                                 notify_counterparty, recorded_by)
    values (${tx.id}, ${ctx.orgId}, ${input.amountPaise}, ${toInterest}, ${input.amountPaise - toInterest}, ${input.paidOn},
            ${input.mode}::public.payment_mode, ${input.reference ?? null}, ${input.notify}, ${ctx.user.id})
    returning id`;
  await txEvent(tx, await userActor(ctx), "payment.recorded", { amountPaise: input.amountPaise, paidOn: input.paidOn, mode: input.mode, interestPaise: toInterest });
  const status = await refreshRunning(tx);
  if (input.notify) await notifyPayment(tx, input.amountPaise);
  await audit(ctx, { action: "payment.recorded", entity: "transaction", entityId: tx.id, after: { amountPaise: input.amountPaise, paidOn: input.paidOn, status } });
  return { id: pay.id, status };
}

/** "Mark fully paid": records a payment of everything due today. */
export async function markPaid(ctx: Ctx, id: string, input: { paidOn: string; mode: PaymentMode; reference?: string }) {
  const tx = await loadTx(ctx, id);
  const due = (await positionOf(tx, input.paidOn)).duePaise;
  if (due <= 0) return { status: await refreshRunning(tx) };
  return recordPayment(ctx, id, { amountPaise: due, paidOn: input.paidOn, mode: input.mode, reference: input.reference, notify: false });
}

/** T12: tell the counterparty a payment was recorded, so both sides see the same balance. */
async function notifyPayment(tx: TxRow, amountPaise: number) {
  const [[org], cp] = await Promise.all([
    sql()<{ name: string }[]>`select coalesce(display_name, legal_name) as name from public.organisations where id = ${tx.org_id}`,
    counterpartyPhone(tx.counterparty_id),
  ]);
  const p = await positionOf(tx);
  await queueMessage({
    orgId: tx.org_id, channel: "whatsapp", ...cp, template: "payment_recorded",
    body: `${org.name} recorded a payment of Rs ${(amountPaise / 100).toLocaleString("en-IN")} against ${tx.reference}. Balance Rs ${(p.duePaise / 100).toLocaleString("en-IN")}.`,
  });
}

// ---------------------------------------------------------------- attachments

const ALLOWED: { type: "application/pdf" | "image/png" | "image/jpeg"; ext: string; magic: number[] }[] = [
  { type: "application/pdf", ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  { type: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
];

/** GST bill, delivery challan or contract: PDF, JPG or PNG, 10 MB each, at most 5 (v3 8.3). Checked from the bytes. */
export async function addAttachment(ctx: Ctx, id: string, file: File) {
  const tx = await loadTx(ctx, id);
  if (tx.status !== "draft" && tx.status !== "changes_requested") throw new AppError("conflict", "Attachments can be added while the agreement is a draft.");
  const [{ n }] = await sql()<{ n: number }[]>`select count(*)::int as n from public.transaction_attachments where transaction_id = ${id}`;
  if (n >= 5) throw new AppError("validation_failed", "At most 5 files.", { file: "At most 5 files per agreement." });
  if (file.size > 10 * 1024 * 1024 || file.size === 0) throw new AppError("validation_failed", "File type or size not allowed.", { file: "File type or size not allowed." });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = ALLOWED.find((a) => a.magic.every((b, i) => bytes[i] === b));
  if (!kind) throw new AppError("validation_failed", "File type or size not allowed.", { file: "File type or size not allowed." });
  const objPath = `transactions/${id}/${crypto.randomUUID()}.${kind.ext}`;
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  await sql()`
    insert into app_private.stored_objects (bucket, path, content_type, bytes, sha256)
    values ('uploads', ${objPath}, ${kind.type}, ${Buffer.from(bytes)}, ${sha})`;
  const name = file.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 120) || `file.${kind.ext}`;
  const [a] = await sql()<{ id: string }[]>`
    insert into public.transaction_attachments (transaction_id, org_id, file_name, content_type, size_bytes, object_ref, sha256, uploaded_by)
    values (${id}, ${ctx.orgId}, ${name}, ${kind.type}, ${bytes.length}, ${`uploads/${objPath}`}, ${sha}, ${ctx.user.id}) returning id`;
  await txEvent(tx, await userActor(ctx), "attachment.added", { name });
  return { id: a.id, name };
}

export async function attachmentBytes(orgId: string, transactionId: string, attachmentId: string) {
  const [a] = await sql()<{ file_name: string; content_type: string; object_ref: string }[]>`
    select file_name, content_type, object_ref from public.transaction_attachments
     where id = ${attachmentId} and transaction_id = ${transactionId} and org_id = ${orgId}`;
  if (!a) throw notFound("This file");
  const [o] = await sql()<{ bytes: Buffer }[]>`
    select bytes from app_private.stored_objects where bucket = 'uploads' and path = ${a.object_ref.replace(/^uploads\//, "")}`;
  if (!o) throw notFound("This file");
  return { bytes: new Uint8Array(o.bytes), name: a.file_name, type: a.content_type };
}

// ---------------------------------------------------------------- detail and list (S16)

export interface TxView {
  id: string;
  reference: string;
  type: TxType;
  status: TxStatus;
  version: number;
  counterparty: { id: string; name: string; mobileMasked: string; emailMasked: string | null; bankLinked: boolean };
  invoiceNo: string | null;
  invoiceDate: string;
  placeOfSupply: string | null;
  items: ItemLine[];
  totalPaise: number;
  paidNowPaise: number;
  dueDate: string;
  interestBp: number;
  terms: string;
  channels: string[];
  linkValidDays: number;
  linkExpiresAt: string | null;
  money: { principalPaise: number; interestPaise: number; duePaise: number; paidPaise: number; daysOverdue: number; daysLeft: number };
  timeline: { step: "draft" | "sent" | "viewed" | "accepted" | "active" | "paid"; at: string | null }[];
  seal: { sha256: string; sealedAt: string; acceptedName: string; mobileMasked: string; otpRef: string; ip: string | null; device: string | null; verifyUrl: string } | null;
  lastDecision: { decision: "accept" | "reject" | "changes"; comment: string | null; reason: string | null; at: string } | null;
  payments: { id: string; amountPaise: number; interestPaise: number; principalPaise: number; paidOn: string; mode: PaymentMode; reference: string | null; by: string | null }[];
  attachments: { id: string; name: string; type: string; size: number }[];
  events: { at: string; actorType: string; actorName: string | null; event: string; detail: Record<string, unknown> }[];
  /** The latest E-Settlement of this agreement, if any. */
  settlement: { id: string; reference: string; status: string } | null;
}

export async function getTransaction(ctx: Ctx, id: string): Promise<TxView> {
  let tx = await loadTx(ctx, id);
  const status = await refreshRunning(tx);
  if (status !== tx.status) tx = await loadTx(ctx, id);
  const db = sql();
  const today = istDate(new Date());
  const [doc, [cp], seals, [decision], payments, attachments, events, pos, [settlement]] = await Promise.all([
    documentFor(tx),
    db<{ id: string; legal_name: string; mobile_masked: string; email_masked: string | null; upi_status: string }[]>`
      select id, legal_name, mobile_masked, email_masked, upi_status::text as upi_status from public.counterparties where id = ${tx.counterparty_id}`,
    db<{ sha256: string; sealed_at: Date; accepted_name: string; mobile_masked: string; otp_ref: string; ip: string | null; device: string | null }[]>`
      select sha256, sealed_at, accepted_name, mobile_masked, otp_ref, host(ip) as ip, device from public.transaction_seals
       where transaction_id = ${id} order by version desc limit 1`,
    db<{ decision: "accept" | "reject" | "changes"; comment: string | null; reason: string | null; decided_at: Date }[]>`
      select decision, comment, reason, decided_at from public.transaction_decisions where transaction_id = ${id} order by decided_at desc limit 1`,
    db<{ id: string; amount_paise: string; interest_paise: string; principal_paise: string; paid_on: string; mode: PaymentMode; reference: string | null; by: string | null }[]>`
      select p.id, p.amount_paise, p.interest_paise, p.principal_paise, to_char(p.paid_on, 'YYYY-MM-DD') as paid_on, p.mode, p.reference, u.full_name as by
        from public.payments p left join public.user_profiles u on u.id = p.recorded_by where p.transaction_id = ${id} order by p.paid_on, p.created_at`,
    db<{ id: string; file_name: string; content_type: string; size_bytes: number }[]>`
      select id, file_name, content_type, size_bytes from public.transaction_attachments where transaction_id = ${id} order by created_at`,
    db<{ at: Date; actor_type: string; actor_name: string | null; event: string; detail: Record<string, unknown> }[]>`
      select at, actor_type, actor_name, event, detail from public.transaction_events where transaction_id = ${id} order by at desc, id desc`,
    positionOf(tx, today),
    db<{ id: string; reference: string; status: string }[]>`
      select id, reference, status::text as status from public.settlements where transaction_id = ${id} order by created_at desc limit 1`,
  ]);
  const eventAt = (names: string[]) => events.filter((e) => names.includes(e.event)).at(-1)?.at.toISOString() ?? null;
  const running = OPEN_STATUSES.includes(tx.status) || tx.status === "paid" || tx.status === "settled";
  return {
    id: tx.id,
    reference: tx.reference,
    type: tx.type,
    status: tx.status,
    version: tx.version,
    counterparty: { id: cp.id, name: cp.legal_name, mobileMasked: cp.mobile_masked, emailMasked: cp.email_masked, bankLinked: cp.upi_status === "linked" },
    invoiceNo: tx.invoice_no,
    invoiceDate: tx.invoice_date,
    placeOfSupply: tx.place_of_supply,
    items: doc.items,
    totalPaise: Number(tx.total_paise),
    paidNowPaise: Number(tx.paid_now_paise),
    dueDate: tx.due_date,
    interestBp: tx.interest_bp,
    terms: tx.terms,
    channels: tx.channels,
    linkValidDays: tx.link_valid_days,
    linkExpiresAt: tx.link_expires_at?.toISOString() ?? null,
    money: {
      principalPaise: running ? pos.principalPaise : Number(tx.total_paise) - Number(tx.paid_now_paise),
      interestPaise: running ? pos.interestPaise : 0,
      duePaise: running ? pos.duePaise : Number(tx.total_paise) - Number(tx.paid_now_paise),
      paidPaise: Number(tx.paid_now_paise) + payments.reduce((s, p) => s + Number(p.amount_paise), 0),
      daysOverdue: running ? pos.daysOverdue : 0,
      daysLeft: Math.max(0, daysBetweenDates(today, tx.due_date)),
    },
    timeline: [
      { step: "draft", at: tx.created_at.toISOString() },
      { step: "sent", at: tx.sent_at?.toISOString() ?? null },
      { step: "viewed", at: tx.viewed_at?.toISOString() ?? null },
      { step: "accepted", at: tx.decided_at && tx.sealed_at ? tx.decided_at.toISOString() : null },
      { step: "active", at: tx.sealed_at?.toISOString() ?? null },
      { step: "paid", at: tx.status === "paid" ? (tx.closed_at?.toISOString() ?? eventAt(["status.paid"])) : null },
    ],
    seal: seals[0]
      ? {
          sha256: seals[0].sha256, sealedAt: seals[0].sealed_at.toISOString(), acceptedName: seals[0].accepted_name,
          mobileMasked: seals[0].mobile_masked, otpRef: seals[0].otp_ref, ip: seals[0].ip, device: seals[0].device, verifyUrl: doc.verifyUrl,
        }
      : null,
    lastDecision: decision ? { decision: decision.decision, comment: decision.comment, reason: decision.reason, at: decision.decided_at.toISOString() } : null,
    payments: payments.map((p) => ({
      id: p.id, amountPaise: Number(p.amount_paise), interestPaise: Number(p.interest_paise), principalPaise: Number(p.principal_paise),
      paidOn: p.paid_on, mode: p.mode, reference: p.reference, by: p.by,
    })),
    attachments: attachments.map((a) => ({ id: a.id, name: a.file_name, type: a.content_type, size: a.size_bytes })),
    events: events.map((e) => ({ at: e.at.toISOString(), actorType: e.actor_type, actorName: e.actor_name, event: e.event, detail: e.detail })),
    settlement: settlement ?? null,
  };
}

export async function listTransactions(ctx: Ctx, filter: { status?: string; counterpartyId?: string } = {}) {
  const db = sql();
  const rows = await db<{ id: string; reference: string; type: TxType; status: TxStatus; legal_name: string; counterparty_id: string; total_paise: string; paid_now_paise: string; due_date: string; created_at: Date }[]>`
    select t.id, t.reference, t.type, t.status, c.legal_name, t.counterparty_id, t.total_paise, t.paid_now_paise,
           to_char(t.due_date, 'YYYY-MM-DD') as due_date, t.created_at
      from public.transactions t join public.counterparties c on c.id = t.counterparty_id
     where t.org_id = ${ctx.orgId}
       ${filter.status ? db`and t.status = ${filter.status}::public.transaction_status` : db``}
       ${filter.counterpartyId ? db`and t.counterparty_id = ${filter.counterpartyId}` : db``}
     order by t.created_at desc limit 200`;
  return rows.map((r) => ({
    id: r.id, reference: r.reference, type: r.type, status: r.status, counterparty: { id: r.counterparty_id, name: r.legal_name },
    totalPaise: Number(r.total_paise), balancePaise: Number(r.total_paise) - Number(r.paid_now_paise), dueDate: r.due_date, createdAt: r.created_at.toISOString(),
  }));
}

/** For the daily overdue job: 00:30 IST on the day after the due date. */
export const overdueRunAt = (dueDate: string) => {
  const d = new Date(`${dueDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return istInstant(d.toISOString().slice(0, 10), "00:30");
};
