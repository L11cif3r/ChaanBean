import "server-only";
import crypto from "node:crypto";
import { formatDate, istDate } from "@/lib/dates";
import { maskEmail } from "@/lib/mask";
import { fixedClauses, position, runningStatus, type TxStatus, type TxType } from "@/lib/transactions";
import { audit } from "@/server/audit";
import { decryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { enqueue } from "@/server/jobs/runner";
import { queueMessage } from "@/server/outbox";
import { agreementPdf } from "@/server/pdf/agreement";
import { checkLinkOtp, deviceOf, sendLinkOtp } from "@/server/links/otp";
import { otpSender } from "@/server/providers/otp";
import { evidenceStore } from "@/server/storage";
import {
  commitSendUnit, counterpartyPhone, documentFor, hashToken, overdueRunAt, refreshRunning, sealedPdf, sendLink, tellUser, txCols, txEvent, type TxRow,
} from "./service";

// The counterparty's page for an agreement (PRD v3.0 Figure 21; v1.0 S15, FR-TX-04/05/06/07, FR-BS-04/05/06).
// Opening the link marks the agreement Viewed (the send charge is now used). The counterparty reads the summary and the
// full PDF, then accepts with the OTP sent to the mobile on record and an acknowledgement, asks for changes (comment
// required) or rejects (reason optional). Accepting seals the agreement at once: final PDF with the acceptance block,
// SHA-256, write-once storage, copies to both parties.

export interface Visitor {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

async function byToken(token: string): Promise<TxRow | null> {
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return null;
  const [tx] = await sql()<TxRow[]>`select ${txCols()} from public.transactions where link_token_hash = ${hashToken(token)}`;
  if (!tx) return null;
  if ((tx.status === "sent" || tx.status === "viewed") && tx.link_expires_at && tx.link_expires_at <= new Date()) {
    await expireTransaction(tx.id, tx.version);
    return (await sql()<TxRow[]>`select ${txCols()} from public.transactions where id = ${tx.id}`)[0] ?? null;
  }
  return tx;
}

async function mustByToken(token: string) {
  const tx = await byToken(token);
  if (!tx) throw notFound("This link");
  return tx;
}

const counterpartyActor = (name: string | null) => ({ type: "counterparty" as const, name });

export interface AgreementPageView {
  status: TxStatus;
  reference: string;
  type: TxType;
  version: number;
  requester: { name: string; phone: string | null };
  counterpartyName: string;
  contactName: string;
  mobileMasked: string;
  summary: { invoiceNo: string | null; invoiceDate: string; totalPaise: number; paidPaise: number; balancePaise: number; dueDate: string; interestBp: number };
  clauses: string[];
  terms: string;
  attachments: { id: string; name: string }[];
  linkExpiresAt: string | null;
  decision: { decision: "accept" | "reject" | "changes"; at: string } | null;
  sealedAt: string | null;
  testMode: boolean;
}

export async function agreementPage(token: string, who: Visitor): Promise<AgreementPageView | null> {
  let tx = await byToken(token);
  if (!tx) return null;
  // First open: the agreement is Viewed and the send charge is used (v3 section 10).
  if (tx.status === "sent") {
    const [viewed] = await sql()<TxRow[]>`
      update public.transactions set status = 'viewed', viewed_at = coalesce(viewed_at, now())
       where id = ${tx.id} and status = 'sent' returning ${txCols()}`;
    if (viewed) {
      await commitSendUnit(viewed);
      await txEvent(viewed, counterpartyActor(null), "viewed", { device: deviceOf(who.userAgent), ip: who.ip });
      tx = viewed;
    }
  }
  const db = sql();
  const [[org], [cp], attachments, [decision], doc] = await Promise.all([
    db<{ name: string; contact_mobile: string | null; phone: string | null }[]>`
      select coalesce(o.display_name, o.legal_name) as name, o.contact_mobile, u.phone
        from public.organisations o left join auth.users u on u.id = ${tx.created_by}::uuid where o.id = ${tx.org_id}`,
    db<{ legal_name: string; contact_name: string; mobile_masked: string }[]>`
      select legal_name, contact_name, mobile_masked from public.counterparties where id = ${tx.counterparty_id}`,
    db<{ id: string; file_name: string }[]>`select id, file_name from public.transaction_attachments where transaction_id = ${tx.id} order by created_at`,
    db<{ decision: "accept" | "reject" | "changes"; decided_at: Date }[]>`
      select decision, decided_at from public.transaction_decisions where transaction_id = ${tx.id} and version = ${tx.version} order by decided_at desc limit 1`,
    documentFor(tx),
  ]);
  const phone = (org.contact_mobile ?? org.phone)?.replace(/\D/g, "").slice(-10) ?? null;
  return {
    status: tx.status,
    reference: tx.reference,
    type: tx.type,
    version: tx.version,
    requester: { name: org.name, phone: phone && phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : null },
    counterpartyName: cp.legal_name,
    contactName: cp.contact_name,
    mobileMasked: cp.mobile_masked,
    summary: {
      invoiceNo: tx.invoice_no, invoiceDate: tx.invoice_date, totalPaise: Number(tx.total_paise), paidPaise: Number(tx.paid_now_paise),
      balancePaise: Number(tx.total_paise) - Number(tx.paid_now_paise), dueDate: tx.due_date, interestBp: tx.interest_bp,
    },
    clauses: fixedClauses(tx.type, { rateBp: tx.interest_bp, dueDate: formatDate(tx.due_date), jurisdiction: doc.jurisdiction }),
    terms: tx.terms,
    attachments: attachments.map((a) => ({ id: a.id, name: a.file_name })),
    linkExpiresAt: tx.link_expires_at?.toISOString() ?? null,
    decision: decision ? { decision: decision.decision, at: decision.decided_at.toISOString() } : null,
    sealedAt: tx.sealed_at?.toISOString() ?? null,
    testMode: otpSender().isMock,
  };
}

/** The PDF behind "View full agreement" (viewing is logged), or the sealed copy once accepted. */
export async function agreementPdfFor(token: string, who: Visitor) {
  const tx = await mustByToken(token);
  if (!["sent", "viewed", "changes_requested", "accepted", "active", "partially_paid", "overdue", "paid", "settled"].includes(tx.status)) {
    throw new AppError("conflict", "This agreement is no longer available.");
  }
  const sealed = await sealedPdf(tx);
  if (sealed) return sealed;
  await txEvent(tx, counterpartyActor(null), "pdf.viewed", { device: deviceOf(who.userAgent) });
  return { bytes: await agreementPdf(await documentFor(tx)), name: `${tx.reference}-v${tx.version}.pdf` };
}

export async function agreementAttachment(token: string, attachmentId: string) {
  const tx = await mustByToken(token);
  const [a] = await sql()<{ file_name: string; content_type: string; object_ref: string }[]>`
    select file_name, content_type, object_ref from public.transaction_attachments where id = ${attachmentId} and transaction_id = ${tx.id}`;
  if (!a) throw notFound("This file");
  const [o] = await sql()<{ bytes: Buffer }[]>`
    select bytes from app_private.stored_objects where bucket = 'uploads' and path = ${a.object_ref.replace(/^uploads\//, "")}`;
  if (!o) throw notFound("This file");
  return { bytes: new Uint8Array(o.bytes), name: a.file_name, type: a.content_type };
}

// ---------------------------------------------------------------- OTP (S15 marker 4)

export async function sendAgreementOtp(token: string) {
  const tx = await mustByToken(token);
  if (tx.status !== "viewed" && tx.status !== "sent") throw new AppError("conflict", "This agreement is no longer waiting for your answer.");
  const db = sql();
  const [[cp], [org]] = await Promise.all([
    db<{ mobile_ciphertext: string; mobile_masked: string }[]>`select mobile_ciphertext, mobile_masked from public.counterparties where id = ${tx.counterparty_id}`,
    db<{ name: string }[]>`select coalesce(display_name, legal_name) as name from public.organisations where id = ${tx.org_id}`,
  ]);
  return sendLinkOtp("transaction", tx.id, { mobileCiphertext: cp.mobile_ciphertext, mobileMasked: cp.mobile_masked }, org.name);
}

// ---------------------------------------------------------------- decision (S15 marker 5)

export type DecisionInput =
  | { decision: "ACCEPT"; otp: string; acknowledged: true; acceptedName?: string }
  | { decision: "CHANGES"; comment: string }
  | { decision: "REJECT"; reason?: "not_mine" | "wrong_amount" | "goods_not_received" | "other"; comment?: string };

export async function decideAgreement(token: string, input: DecisionInput, who: Visitor) {
  const tx = await mustByToken(token);
  if (tx.status !== "viewed" && tx.status !== "sent") throw new AppError("conflict", "This agreement is no longer waiting for your answer.");
  const db = sql();
  const [cp] = await db<{ contact_name: string; mobile_masked: string; email_ciphertext: string | null }[]>`
    select contact_name, mobile_masked, email_ciphertext from public.counterparties where id = ${tx.counterparty_id}`;

  if (input.decision === "CHANGES") {
    const comment = input.comment.trim();
    if (comment.length < 10 || comment.length > 1000) throw new AppError("validation_failed", "Tell us what should change.", { comment: "Tell us what should change (10 to 1,000 characters)." });
    await moveTo(tx, "changes_requested");
    await db`
      insert into public.transaction_decisions (transaction_id, org_id, version, decision, comment, ip, user_agent)
      values (${tx.id}, ${tx.org_id}, ${tx.version}, 'changes', ${comment}, ${who.ip}::inet, ${who.userAgent?.slice(0, 400) ?? null})`;
    await txEvent(tx, counterpartyActor(cp.contact_name), "changes_requested", { comment });
    await tellCreator(tx, `${cp.contact_name} asked for changes to ${tx.reference}: "${comment.slice(0, 200)}"`);
    await audit({ ...who, orgId: tx.org_id, user: null, actorType: "counterparty", actorId: `tx:${tx.id}` }, { action: "transaction.changes_requested", entity: "transaction", entityId: tx.id });
    return { status: "changes_requested" as const };
  }

  if (input.decision === "REJECT") {
    await moveTo(tx, "rejected");
    await db`
      insert into public.transaction_decisions (transaction_id, org_id, version, decision, reason, comment, ip, user_agent)
      values (${tx.id}, ${tx.org_id}, ${tx.version}, 'reject', ${input.reason ?? null}, ${input.comment?.trim().slice(0, 1000) || null},
              ${who.ip}::inet, ${who.userAgent?.slice(0, 400) ?? null})`;
    await db`update public.transactions set closed_at = now() where id = ${tx.id}`;
    await txEvent(tx, counterpartyActor(cp.contact_name), "rejected", { reason: input.reason ?? null });
    await tellCreator(tx, `${cp.contact_name} rejected ${tx.reference}.`);
    await audit({ ...who, orgId: tx.org_id, user: null, actorType: "counterparty", actorId: `tx:${tx.id}` }, { action: "transaction.rejected", entity: "transaction", entityId: tx.id });
    return { status: "rejected" as const };
  }

  // ACCEPT: OTP to the mobile on record and the acknowledgement (FR-BS-04), then seal (v3 8.5).
  const otpRef = await checkLinkOtp("transaction", tx.id, input.otp);
  const name = input.acceptedName?.trim() || cp.contact_name;
  if (name.length < 2 || name.length > 120) throw new AppError("validation_failed", "Enter your name.", { acceptedName: "Enter your full name." });
  await moveTo(tx, "accepted");
  const at = new Date();
  await db`
    insert into public.transaction_decisions (transaction_id, org_id, version, decision, accepted_name, otp_ref, ip, user_agent, decided_at)
    values (${tx.id}, ${tx.org_id}, ${tx.version}, 'accept', ${name}, ${otpRef}, ${who.ip}::inet, ${who.userAgent?.slice(0, 400) ?? null}, ${at})`;
  await txEvent(tx, counterpartyActor(name), "accepted", { otpRef, ip: who.ip, device: deviceOf(who.userAgent) });
  const seal = await sealTransaction(tx, { name, mobileMasked: cp.mobile_masked, otpRef, at, ip: who.ip, device: deviceOf(who.userAgent) });
  await audit({ ...who, orgId: tx.org_id, user: null, actorType: "counterparty", actorId: `tx:${tx.id}` }, {
    action: "transaction.accepted", entity: "transaction", entityId: tx.id, after: { version: tx.version, sha256: seal.sha256 },
  });
  return { status: "accepted" as const, reference: tx.reference, sealed: true, sha256: seal.sha256 };
}

async function moveTo(tx: TxRow, status: TxStatus) {
  const [moved] = await sql()<{ id: string }[]>`
    update public.transactions set status = ${status}::public.transaction_status, decided_at = now()
     where id = ${tx.id} and status = ${tx.status}::public.transaction_status returning id`;
  if (!moved) throw new AppError("conflict", "This agreement changed. Please reload the page.");
}

/** v3 8.5: final PDF with the acceptance block, SHA-256 of its bytes, write-once store, copies to both parties. */
async function sealTransaction(tx: TxRow, acceptance: { name: string; mobileMasked: string; otpRef: string; at: Date; ip: string | null; device: string | null }) {
  const bytes = await agreementPdf(await documentFor(tx, acceptance));
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const pdfRef = await evidenceStore.putOnce(`transactions/${tx.id}/v${tx.version}-sealed.pdf`, bytes, "application/pdf");
  const db = sql();
  await db`
    insert into public.transaction_seals (transaction_id, org_id, version, reference, pdf_ref, sha256, sealed_at, accepted_name, mobile_masked, otp_ref, ip, device)
    values (${tx.id}, ${tx.org_id}, ${tx.version}, ${tx.reference}, ${pdfRef}, ${sha256}, ${acceptance.at}, ${acceptance.name},
            ${acceptance.mobileMasked}, ${acceptance.otpRef}, ${acceptance.ip}::inet, ${acceptance.device})`;
  // Running from now: Active, Partially paid or Paid from the numbers (the advance can already settle a deal).
  const today = istDate(new Date());
  const p = position({ openingPaise: Number(tx.total_paise) - Number(tx.paid_now_paise), dueDate: tx.due_date, rateBp: tx.interest_bp, payments: [], today });
  const status = runningStatus(p, Number(tx.paid_now_paise) > 0, tx.due_date, today);
  await db`
    update public.transactions set status = ${status}::public.transaction_status, sealed_at = ${acceptance.at},
           closed_at = ${status === "paid" ? acceptance.at : null}
     where id = ${tx.id}`;
  await txEvent(tx, { type: "system" }, "sealed", { sha256, version: tx.version });
  await enqueue("transaction.overdue", { id: tx.id }, { orgId: tx.org_id, runAt: overdueRunAt(tx.due_date), dedupeKey: `transaction.overdue:${tx.id}:${tx.due_date}` });
  await sendSealedCopies(tx);
  return { sha256, pdfRef };
}

/** T10: both parties get the sealed copy (email with the PDF where there is one; WhatsApp and SMS link). */
async function sendSealedCopies(tx: TxRow) {
  const db = sql();
  const [[cp], phone] = await Promise.all([
    db<{ email_ciphertext: string | null }[]>`select email_ciphertext from public.counterparties where id = ${tx.counterparty_id}`,
    counterpartyPhone(tx.counterparty_id),
  ]);
  const link = `${tx.link_base}/a/${decryptField(tx.link_token_ciphertext!, "transactions.token")}`;
  const body = `Agreement ${tx.reference} is accepted and sealed. Download: ${link}`;
  await queueMessage({ orgId: tx.org_id, channel: "whatsapp", ...phone, template: "agreement_sealed", body });
  if (cp.email_ciphertext) {
    const email = decryptField(cp.email_ciphertext, "counterparties.email");
    await queueMessage({
      orgId: tx.org_id, channel: "email", recipientMasked: maskEmail(email), to: email,
      template: "agreement_sealed", subject: `Sealed agreement ${tx.reference}`, body: `${body} (PDF attached)`,
    });
  }
  await tellCreator(tx, `${tx.reference} is accepted and sealed. Open it in ChaanBean to download the sealed copy and evidence.`);
}

/** T09: the creator hears about the decision (email until in-app notifications arrive with Part 6). */
async function tellCreator(tx: TxRow, body: string) {
  await tellUser(tx.org_id, tx.created_by, "agreement_decided", `Update on ${tx.reference}`, body);
}

// ---------------------------------------------------------------- jobs

/** transaction.expire: no decision within the link validity (v3 8.6). Unopened links give the money back. */
export async function expireTransaction(id: string, version: number) {
  const [tx] = await sql()<TxRow[]>`
    update public.transactions set status = 'expired', closed_at = now()
     where id = ${id} and version = ${version} and status in ('sent', 'viewed') and link_expires_at <= now() returning ${txCols()}`;
  if (!tx) return false;
  if (tx.hold_id && !tx.viewed_at) {
    const { reverseHold } = await import("@/server/billing/charge");
    await reverseHold(tx.org_id, tx.hold_id, "Agreement link expired unopened. Money returned.", "system", `tx-expire:${tx.id}`);
  }
  await txEvent(tx, { type: "system" }, "expired", { unitReturned: Boolean(tx.hold_id && !tx.viewed_at) });
  return true;
}

/** transaction.remind: day 2 and day 5, only while the link has not been opened (v3 8.6). */
export async function remindTransaction(id: string, day: number, version: number) {
  const col = day === 2 ? sql()`reminded_day2_at` : sql()`reminded_day5_at`;
  const [tx] = await sql()<TxRow[]>`
    update public.transactions set ${col} = now()
     where id = ${id} and version = ${version} and status = 'sent' and ${col} is null and link_expires_at > now() returning ${txCols()}`;
  if (!tx) return false;
  await sendLink(tx, true);
  await txEvent(tx, { type: "system" }, "reminded", { day });
  return true;
}

/** transaction.overdue (00:30 IST the day after the due date): Overdue with interest from now; the creator is told (T11). */
export async function overdueTransaction(id: string) {
  const [tx] = await sql()<TxRow[]>`select ${txCols()} from public.transactions where id = ${id}`;
  if (!tx) return false;
  const before = tx.status;
  const after = await refreshRunning(tx);
  if (before !== "overdue" && after === "overdue") {
    const [cp] = await sql()<{ legal_name: string }[]>`select legal_name from public.counterparties where id = ${tx.counterparty_id}`;
    await tellCreator(tx, `${tx.reference} with ${cp.legal_name} is overdue. Interest now runs at ${tx.interest_bp / 100}% a year on the balance.`);
  }
  return after === "overdue";
}

