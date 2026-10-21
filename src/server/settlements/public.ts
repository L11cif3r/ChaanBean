import "server-only";
import crypto from "node:crypto";
import { formatDate, istDate } from "@/lib/dates";
import { maskEmail } from "@/lib/mask";
import {
  SETTLEMENT_AWAITING, counterProblems, settlementClauses, type CounterInput, type Row, type SettlementMode, type SettlementStatus,
} from "@/lib/settlements";
import { audit } from "@/server/audit";
import { decryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { enqueue } from "@/server/jobs/runner";
import { checkLinkOtp, deviceOf, sendLinkOtp } from "@/server/links/otp";
import { queueMessage } from "@/server/outbox";
import { settlementPdf } from "@/server/pdf/settlement";
import { otpSender } from "@/server/providers/otp";
import { evidenceStore } from "@/server/storage";
import { counterpartyPhone, hashToken, tellUser, txCols, txEvent, type TxRow } from "@/server/transactions/service";
import type { Visitor } from "@/server/transactions/public";
import {
  commitSettlementUnit, documentFor, instalmentCheckAt, instalmentDueAt, refreshSchedule, rowsFor, sealedSettlementPdf, sendSettlementLink,
  settlementLink, stCols, stEvent, type StRow,
} from "./service";

// The debtor's page for an E-Settlement (PRD v3.0 8.7; v1.0 5.8, FR-ES-03/04). Opening the link marks it Viewed (the
// unit is now used). The debtor sees what was owed, the offer, the schedule and the default clause, then accepts with
// the OTP sent to the mobile on record, rejects, or proposes another amount or other dates. Accepting seals it like an
// agreement and moves the original agreement to Settled.

async function byToken(token: string): Promise<StRow | null> {
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return null;
  const [st] = await sql()<StRow[]>`select ${stCols()} from public.settlements where link_token_hash = ${hashToken(token)}`;
  if (!st) return null;
  if (SETTLEMENT_AWAITING.includes(st.status) && st.link_expires_at && st.link_expires_at <= new Date()) {
    await expireSettlement(st.id, st.version);
    return (await sql()<StRow[]>`select ${stCols()} from public.settlements where id = ${st.id}`)[0] ?? null;
  }
  return st;
}

async function mustByToken(token: string) {
  const st = await byToken(token);
  if (!st) throw notFound("This link");
  return st;
}

const debtorActor = (name: string | null) => ({ type: "counterparty" as const, name });
const debtorCtx = (st: StRow, who: Visitor) => ({ ...who, orgId: st.org_id, user: null, actorType: "counterparty" as const, actorId: `st:${st.id}` });

export interface SettlementPageView {
  status: SettlementStatus;
  reference: string;
  version: number;
  requester: { name: string; phone: string | null };
  debtorName: string;
  contactName: string;
  mobileMasked: string;
  original: string;
  owedPaise: number;
  owedOn: string;
  settlementPaise: number;
  interestAgreedPaise: number;
  waivedPaise: number;
  mode: SettlementMode;
  rows: Row[];
  graceDays: number;
  clauses: string[];
  terms: string;
  linkExpiresAt: string | null;
  sealedAt: string | null;
  testMode: boolean;
}

export async function settlementPage(token: string, who: Visitor): Promise<SettlementPageView | null> {
  let st = await byToken(token);
  if (!st) return null;
  if (st.status === "sent") {
    const [viewed] = await sql()<StRow[]>`
      update public.settlements set status = 'viewed', viewed_at = coalesce(viewed_at, now())
       where id = ${st.id} and status = 'sent' returning ${stCols()}`;
    if (viewed) {
      await commitSettlementUnit(viewed);
      await stEvent(viewed, debtorActor(null), "viewed", { device: deviceOf(who.userAgent), ip: who.ip });
      st = viewed;
    }
  }
  const db = sql();
  const [[org], [cp], doc] = await Promise.all([
    db<{ name: string; contact_mobile: string | null; phone: string | null }[]>`
      select coalesce(o.display_name, o.legal_name) as name, o.contact_mobile, u.phone
        from public.organisations o left join auth.users u on u.id = ${st.created_by}::uuid where o.id = ${st.org_id}`,
    db<{ legal_name: string; contact_name: string; mobile_masked: string }[]>`
      select legal_name, contact_name, mobile_masked from public.counterparties where id = ${st.counterparty_id}`,
    documentFor(st),
  ]);
  const phone = (org.contact_mobile ?? org.phone)?.replace(/\D/g, "").slice(-10) ?? null;
  return {
    status: st.status,
    reference: st.reference,
    version: st.version,
    requester: { name: org.name, phone: phone && phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : null },
    debtorName: cp.legal_name,
    contactName: cp.contact_name,
    mobileMasked: cp.mobile_masked,
    original: doc.original.reference ?? `GST bill ${doc.original.billNo ?? ""}`.trim(),
    owedPaise: doc.owedPaise,
    owedOn: doc.owedOn,
    settlementPaise: doc.settlementPaise,
    interestAgreedPaise: doc.interestAgreedPaise,
    waivedPaise: doc.waivedPaise,
    mode: doc.mode,
    rows: doc.rows,
    graceDays: doc.graceDays,
    clauses: settlementClauses({ graceDays: doc.graceDays, originalReference: doc.original.reference, outsideBillNo: doc.original.billNo, jurisdiction: doc.jurisdiction }),
    terms: st.terms,
    linkExpiresAt: st.link_expires_at?.toISOString() ?? null,
    sealedAt: st.sealed_at?.toISOString() ?? null,
    testMode: otpSender().isMock,
  };
}

export async function settlementPdfFor(token: string, who: Visitor) {
  const st = await mustByToken(token);
  if (["draft", "rejected", "expired", "cancelled"].includes(st.status)) throw new AppError("conflict", "This settlement is no longer available.");
  const sealed = await sealedSettlementPdf(st);
  if (sealed) return sealed;
  await stEvent(st, debtorActor(null), "pdf.viewed", { device: deviceOf(who.userAgent) });
  return { bytes: await settlementPdf(await documentFor(st)), name: `${st.reference}-v${st.version}.pdf` };
}

export async function sendSettlementOtp(token: string) {
  const st = await mustByToken(token);
  if (!SETTLEMENT_AWAITING.includes(st.status)) throw new AppError("conflict", "This settlement is no longer waiting for your answer.");
  const db = sql();
  const [[cp], [org]] = await Promise.all([
    db<{ mobile_ciphertext: string; mobile_masked: string }[]>`select mobile_ciphertext, mobile_masked from public.counterparties where id = ${st.counterparty_id}`,
    db<{ name: string }[]>`select coalesce(display_name, legal_name) as name from public.organisations where id = ${st.org_id}`,
  ]);
  return sendLinkOtp("settlement", st.id, { mobileCiphertext: cp.mobile_ciphertext, mobileMasked: cp.mobile_masked }, org.name);
}

export type SettlementDecision =
  | { decision: "ACCEPT"; otp: string; acknowledged: true; acceptedName?: string }
  | ({ decision: "COUNTER" } & CounterInput)
  | { decision: "REJECT"; comment?: string };

async function moveTo(st: StRow, status: SettlementStatus) {
  const [moved] = await sql()<{ id: string }[]>`
    update public.settlements set status = ${status}::public.settlement_status, decided_at = now()
     where id = ${st.id} and status = ${st.status}::public.settlement_status returning id`;
  if (!moved) throw new AppError("conflict", "This settlement changed. Please reload the page.");
}

export async function decideSettlement(token: string, input: SettlementDecision, who: Visitor) {
  const st = await mustByToken(token);
  if (!SETTLEMENT_AWAITING.includes(st.status)) throw new AppError("conflict", "This settlement is no longer waiting for your answer.");
  const db = sql();
  const [cp] = await db<{ contact_name: string; mobile_masked: string }[]>`
    select contact_name, mobile_masked from public.counterparties where id = ${st.counterparty_id}`;
  const ua = who.userAgent?.slice(0, 400) ?? null;

  if (input.decision === "COUNTER") {
    const owed = Number(st.owed_paise);
    const problems = counterProblems(input, owed, istDate(new Date()));
    if (Object.keys(problems).length) throw new AppError("validation_failed", "Please check your proposal.", problems);
    const rows = input.mode === "full" ? [{ dueDate: input.fullDate!, amountPaise: input.amountPaise }] : input.instalments;
    await moveTo(st, "counter_proposed");
    await db`
      insert into public.settlement_proposals (settlement_id, org_id, version, amount_paise, mode, rows, comment, proposed_by, ip, user_agent)
      values (${st.id}, ${st.org_id}, ${st.version}, ${input.amountPaise}, ${input.mode}, ${db.json(rows)}, ${input.comment || null},
              ${cp.contact_name}, ${who.ip}::inet, ${ua})`;
    await db`
      insert into public.settlement_decisions (settlement_id, org_id, version, decision, comment, ip, user_agent)
      values (${st.id}, ${st.org_id}, ${st.version}, 'counter', ${input.comment || null}, ${who.ip}::inet, ${ua})`;
    await stEvent(st, debtorActor(cp.contact_name), "counter_proposed", { amountPaise: input.amountPaise, mode: input.mode, instalments: rows.length });
    await tellUser(st.org_id, st.created_by, "settlement_counter", `Counter-proposal on ${st.reference}`,
      `${cp.contact_name} proposed ${input.mode === "full" ? "one payment" : `${rows.length} instalments`} of Rs ${(input.amountPaise / 100).toLocaleString("en-IN")} in total on settlement ${st.reference}. Open it in ChaanBean to accept the proposal or revise.`);
    await audit(debtorCtx(st, who), { action: "settlement.counter_proposed", entity: "settlement", entityId: st.id, after: { amountPaise: input.amountPaise } });
    return { status: "counter_proposed" as const };
  }

  if (input.decision === "REJECT") {
    await moveTo(st, "rejected");
    await db`
      insert into public.settlement_decisions (settlement_id, org_id, version, decision, comment, ip, user_agent)
      values (${st.id}, ${st.org_id}, ${st.version}, 'reject', ${input.comment?.trim().slice(0, 1000) || null}, ${who.ip}::inet, ${ua})`;
    await db`update public.settlements set closed_at = now() where id = ${st.id}`;
    await stEvent(st, debtorActor(cp.contact_name), "rejected", {});
    await tellUser(st.org_id, st.created_by, "settlement_decided", `Update on ${st.reference}`, `${cp.contact_name} rejected settlement ${st.reference}.`);
    await audit(debtorCtx(st, who), { action: "settlement.rejected", entity: "settlement", entityId: st.id });
    return { status: "rejected" as const };
  }

  const otpRef = await checkLinkOtp("settlement", st.id, input.otp);
  const name = input.acceptedName?.trim() || cp.contact_name;
  if (name.length < 2 || name.length > 120) throw new AppError("validation_failed", "Enter your name.", { acceptedName: "Enter your full name." });
  await moveTo(st, "accepted");
  const at = new Date();
  await db`
    insert into public.settlement_decisions (settlement_id, org_id, version, decision, accepted_name, otp_ref, ip, user_agent, decided_at)
    values (${st.id}, ${st.org_id}, ${st.version}, 'accept', ${name}, ${otpRef}, ${who.ip}::inet, ${ua}, ${at})`;
  await stEvent(st, debtorActor(name), "accepted", { otpRef, ip: who.ip, device: deviceOf(who.userAgent) });
  const seal = await sealSettlement(st, { name, mobileMasked: cp.mobile_masked, otpRef, at, ip: who.ip, device: deviceOf(who.userAgent) });
  await audit(debtorCtx(st, who), { action: "settlement.accepted", entity: "settlement", entityId: st.id, after: { version: st.version, sha256: seal.sha256 } });
  return { status: "accepted" as const, reference: st.reference, sealed: true, sha256: seal.sha256 };
}

/** FR-ES-04: sealed like an agreement; the original moves to Settled; each instalment is tracked from now. */
async function sealSettlement(st: StRow, acceptance: { name: string; mobileMasked: string; otpRef: string; at: Date; ip: string | null; device: string | null }) {
  const bytes = await settlementPdf(await documentFor(st, acceptance));
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const pdfRef = await evidenceStore.putOnce(`settlements/${st.id}/v${st.version}-sealed.pdf`, bytes, "application/pdf");
  const db = sql();
  await db`
    insert into public.settlement_seals (settlement_id, org_id, version, reference, pdf_ref, sha256, sealed_at, accepted_name, mobile_masked, otp_ref, ip, device)
    values (${st.id}, ${st.org_id}, ${st.version}, ${st.reference}, ${pdfRef}, ${sha256}, ${acceptance.at}, ${acceptance.name},
            ${acceptance.mobileMasked}, ${acceptance.otpRef}, ${acceptance.ip}::inet, ${acceptance.device})`;
  await db`update public.settlements set sealed_at = ${acceptance.at} where id = ${st.id}`;
  await stEvent(st, { type: "system" }, "sealed", { sha256, version: st.version });
  if (st.transaction_id) {
    const [tx] = await db<TxRow[]>`
      update public.transactions set status = 'settled', closed_at = now()
       where id = ${st.transaction_id} and status in ('overdue', 'active', 'partially_paid') returning ${txCols()}`;
    if (tx) await txEvent(tx, { type: "system" }, "settled", { settlement: st.reference });
  }
  const rows = await rowsFor(st.id);
  await Promise.all(rows.flatMap((r) => [
    enqueue("settlement.instalment_due", { id: st.id, seq: r.seq }, { orgId: st.org_id, runAt: instalmentDueAt(r.dueDate), dedupeKey: `settlement.instalment_due:${st.id}:${r.seq}` }),
    enqueue("settlement.instalment_check", { id: st.id }, { orgId: st.org_id, runAt: instalmentCheckAt(r.dueDate, st.grace_days), dedupeKey: `settlement.instalment_check:${st.id}:${r.seq}` }),
  ]));
  await sendSealedCopies(st);
  return { sha256, pdfRef };
}

async function sendSealedCopies(st: StRow) {
  const [[cp], phone] = await Promise.all([
    sql()<{ email_ciphertext: string | null }[]>`select email_ciphertext from public.counterparties where id = ${st.counterparty_id}`,
    counterpartyPhone(st.counterparty_id),
  ]);
  const body = `Settlement ${st.reference} is accepted and sealed. Download: ${settlementLink(st)}`;
  await queueMessage({ orgId: st.org_id, channel: "whatsapp", ...phone, template: "settlement_sealed", body });
  if (cp.email_ciphertext) {
    const email = decryptField(cp.email_ciphertext, "counterparties.email");
    await queueMessage({ orgId: st.org_id, channel: "email", recipientMasked: maskEmail(email), to: email, template: "settlement_sealed", subject: `Sealed settlement ${st.reference}`, body: `${body} (PDF attached)` });
  }
  await tellUser(st.org_id, st.created_by, "settlement_decided", `${st.reference} accepted`, `${st.reference} is accepted and sealed. The instalments are now tracked in ChaanBean.`);
}

// ---------------------------------------------------------------- jobs

export async function expireSettlement(id: string, version: number) {
  const [st] = await sql()<StRow[]>`
    update public.settlements set status = 'expired', closed_at = now()
     where id = ${id} and version = ${version} and status in ('sent', 'viewed') and link_expires_at <= now() returning ${stCols()}`;
  if (!st) return false;
  const unitBack = Boolean(st.hold_id && !st.viewed_at);
  if (st.hold_id && !st.viewed_at) {
    const { reverseHold } = await import("@/server/billing/charge");
    await reverseHold(st.org_id, st.hold_id, "Settlement link expired unopened. Money returned.", "system", `st-expire:${st.id}`);
  }
  await stEvent(st, { type: "system" }, "expired", { unitReturned: unitBack });
  return true;
}

export async function remindSettlement(id: string, day: number, version: number) {
  const col = day === 2 ? sql()`reminded_day2_at` : sql()`reminded_day5_at`;
  const [st] = await sql()<StRow[]>`
    update public.settlements set ${col} = now()
     where id = ${id} and version = ${version} and status = 'sent' and ${col} is null and link_expires_at > now() returning ${stCols()}`;
  if (!st) return false;
  await sendSettlementLink(st, true);
  await stEvent(st, { type: "system" }, "reminded", { day });
  return true;
}

/** FR-ES-05: on the due date the creditor is reminded if the instalment is still unpaid. */
export async function instalmentDue(id: string, seq: number) {
  const [st] = await sql()<StRow[]>`select ${stCols()} from public.settlements where id = ${id}`;
  if (!st || st.status !== "accepted") return false;
  await refreshSchedule(st);
  const [i] = await sql()<{ due_date: string; amount_paise: string; paid_paise: string; status: string }[]>`
    select to_char(due_date, 'YYYY-MM-DD') as due_date, amount_paise, paid_paise, status::text as status
      from public.settlement_instalments where settlement_id = ${id} and seq = ${seq}`;
  if (!i || i.status !== "due") return false;
  const left = Number(i.amount_paise) - Number(i.paid_paise);
  const [cp] = await sql()<{ legal_name: string }[]>`select legal_name from public.counterparties where id = ${st.counterparty_id}`;
  await tellUser(st.org_id, st.created_by, "instalment_due", `Instalment ${seq} of ${st.reference} is due today`,
    `Instalment ${seq} of settlement ${st.reference} with ${cp.legal_name} (Rs ${(left / 100).toLocaleString("en-IN")}) is due today, ${formatDate(i.due_date)}. Record the payment in ChaanBean when it arrives. It counts as missed after ${st.grace_days} days.`);
  await stEvent(st, { type: "system" }, "instalment_due", { seq });
  return true;
}

/** After the grace days: Missed, and the default clause applies (refreshSchedule). */
export async function instalmentCheck(id: string) {
  const [st] = await sql()<StRow[]>`select ${stCols()} from public.settlements where id = ${id}`;
  if (!st) return false;
  return (await refreshSchedule(st)) === "defaulted";
}
