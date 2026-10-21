import "server-only";
import crypto from "node:crypto";
import { formatDate, formatDateTimeIst } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { audit } from "@/server/audit";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { textDoc } from "@/server/pdf/kit";
import { evidenceStore } from "@/server/storage";
import { zip, type ZipEntry } from "@/server/zip";
import type { RequestContext } from "@/server/context";

// Evidence pack (PRD v3.0 8.5 step 5, FR-BS-09; v1.0 S16 marker 4): one ZIP per sealed agreement or E-Settlement with
//   1. the sealed PDF, read back from the write-once store (its hash is re-checked on read),
//   2. the attachments (agreements),
//   3. an acceptance certificate: who accepted, how, when, from where, and the SHA-256,
//   4. the activity log as a PDF, every event to the second,
//   5. a DRAFT certificate under section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (Part A details including the
//      hash), for review by counsel before anyone signs it,
//   6. a list of every file with its SHA-256.
// Wording of 3 and 5 is a placeholder until counsel approves it (v1.0 A8).

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };
type Kind = "transaction" | "settlement";

interface Seal {
  reference: string; version: number; pdf_ref: string; sha256: string; sealed_at: Date; accepted_name: string; mobile_masked: string;
  otp_ref: string; ip: string | null; device: string | null;
}

const sha = (b: Uint8Array) => crypto.createHash("sha256").update(b).digest("hex");
const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });

const EVENT_LABEL: Record<string, string> = {
  created: "Draft created", edited: "Draft edited", sent: "Sent for acceptance", resent: "New version sent", viewed: "Link opened",
  "pdf.viewed": "Full document opened", reminded: "Reminder sent", accepted: "Accepted by OTP", sealed: "Sealed",
  rejected: "Rejected", changes_requested: "Changes requested", counter_proposed: "Counter-proposal made", expired: "Link expired",
  cancelled: "Cancelled", "copy.resent": "Copy resent", "payment.recorded": "Payment recorded", "attachment.added": "File attached",
  settled: "Settled by E-Settlement", settlement_started: "E-Settlement started", settlement_defaulted: "E-Settlement defaulted",
  proposal_adopted: "Counter-proposal accepted", instalment_due: "Instalment due", completed: "Fully paid", defaulted: "Defaulted",
  "status.overdue": "Became overdue", "status.paid": "Paid", "status.partially_paid": "Partly paid", "status.active": "Running",
};

const detailText = (d: Record<string, unknown>) =>
  Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${/Paise$/.test(k) && typeof v === "number" ? inr(v) : Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join("; ");

export async function evidencePack(ctx: Ctx, kind: Kind, id: string): Promise<{ bytes: Uint8Array; name: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound(kind === "transaction" ? "This agreement" : "This settlement");
  const db = sql();
  const table = kind === "transaction" ? db`public.transactions` : db`public.settlements`;
  const [row] = await db<{ id: string; reference: string; counterparty_id: string; org_id: string }[]>`
    select id, reference, counterparty_id, org_id from ${table} where id = ${id} and org_id = ${ctx.orgId}`;
  if (!row) throw notFound(kind === "transaction" ? "This agreement" : "This settlement");
  const [seal] = kind === "transaction"
    ? await db<Seal[]>`select reference, version, pdf_ref, sha256, sealed_at, accepted_name, mobile_masked, otp_ref, host(ip) as ip, device
                        from public.transaction_seals where transaction_id = ${id} order by version desc limit 1`
    : await db<Seal[]>`select reference, version, pdf_ref, sha256, sealed_at, accepted_name, mobile_masked, otp_ref, host(ip) as ip, device
                        from public.settlement_seals where settlement_id = ${id} order by version desc limit 1`;
  if (!seal) throw new AppError("conflict", "The evidence pack is ready once the counterparty has accepted and the document is sealed.");

  const [[org], [cp], events, attachments] = await Promise.all([
    db<{ name: string; gstin: string | null }[]>`select coalesce(display_name, legal_name) as name, gstin from public.organisations where id = ${row.org_id}`,
    db<{ legal_name: string; gstin: string | null }[]>`select legal_name, gstin from public.counterparties where id = ${row.counterparty_id}`,
    kind === "transaction"
      ? db<{ at: Date; actor_type: string; actor_name: string | null; event: string; detail: Record<string, unknown> }[]>`
          select at, actor_type, actor_name, event, detail from public.transaction_events where transaction_id = ${id} order by at, id`
      : db<{ at: Date; actor_type: string; actor_name: string | null; event: string; detail: Record<string, unknown> }[]>`
          select at, actor_type, actor_name, event, detail from public.settlement_events where settlement_id = ${id} order by at, id`,
    kind === "transaction"
      ? db<{ file_name: string; object_ref: string; sha256: string }[]>`
          select file_name, object_ref, sha256 from public.transaction_attachments where transaction_id = ${id} order by created_at`
      : Promise.resolve([] as { file_name: string; object_ref: string; sha256: string }[]),
  ]);

  const now = new Date();
  const sealedPdf = await evidenceStore.get(seal.pdf_ref);
  if (sha(sealedPdf) !== seal.sha256) throw new Error(`Sealed PDF of ${seal.reference} does not match its recorded SHA-256`);
  const what = kind === "transaction" ? "agreement" : "E-Settlement agreement";
  const files: ZipEntry[] = [{ name: `1-${seal.reference}-sealed.pdf`, bytes: sealedPdf, modified: seal.sealed_at }];

  for (const [i, a] of attachments.entries()) {
    const [o] = await db<{ bytes: Buffer }[]>`select bytes from app_private.stored_objects where bucket = 'uploads' and path = ${a.object_ref.replace(/^uploads\//, "")}`;
    if (o) files.push({ name: `2-attachments/${i + 1}-${a.file_name}`, bytes: new Uint8Array(o.bytes) });
  }

  // 3. Acceptance certificate
  const cert = await textDoc({ title: "ACCEPTANCE CERTIFICATE", reference: seal.reference, generatedAt: now });
  cert.para(`This certifies how the ${what} ${seal.reference} (version ${seal.version}) between ${org.name}${org.gstin ? ` (GSTIN ${org.gstin})` : ""} and ${cp.legal_name}${cp.gstin ? ` (GSTIN ${cp.gstin})` : ""} was accepted on ChaanBean.`);
  cert.gap();
  cert.rows([
    ["Accepted by", seal.accepted_name],
    ["Mobile (masked)", seal.mobile_masked],
    ["Method", "One-time password sent to the mobile on record"],
    ["OTP reference", seal.otp_ref],
    ["Date and time", formatDateTimeIst(seal.sealed_at, true)],
    ["IP address", seal.ip ?? "Not recorded"],
    ["Device", seal.device ?? "Not recorded"],
    ["Sealed file", `1-${seal.reference}-sealed.pdf`],
  ]);
  cert.gap();
  cert.heading("SHA-256 of the sealed file");
  cert.para(seal.sha256, 9);
  cert.gap();
  cert.para("The sealed file is kept in write-once storage and cannot be changed. Anyone can check a copy on the ChaanBean verify page with the reference above: the browser works out the file's SHA-256 and compares it with the one recorded at sealing.", 9);
  files.push({ name: "3-acceptance-certificate.pdf", bytes: await cert.save() });

  // 4. Activity log
  const log = await textDoc({ title: "ACTIVITY LOG", reference: seal.reference, generatedAt: now });
  log.para(`Every recorded event for ${seal.reference}, oldest first, in Indian Standard Time. The log cannot be edited or deleted.`, 9);
  log.gap();
  log.table(
    ["Time (IST)", "By", "Event", "Details"],
    events.map((e) => [formatDateTimeIst(e.at, true), e.actor_name ?? e.actor_type, EVENT_LABEL[e.event] ?? e.event, detailText(e.detail)]),
    [0, 120, 215, 330],
    { size: 8 },
  );
  files.push({ name: "4-activity-log.pdf", bytes: await log.save() });

  // 5. Section 63 draft
  const s63 = await textDoc({ title: "CERTIFICATE UNDER SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023 (DRAFT)", reference: seal.reference, generatedAt: now, watermark: "DRAFT" });
  s63.para("DRAFT FOR REVIEW BY COUNSEL. Not to be signed or filed until a lawyer has reviewed it and the person signing has checked every statement.", 9);
  s63.gap();
  s63.heading("Part A (to be completed by the party)");
  s63.rows([
    ["Electronic record", `${what[0].toUpperCase()}${what.slice(1)} ${seal.reference}, version ${seal.version}`],
    ["File name", `1-${seal.reference}-sealed.pdf`],
    ["Size", `${sealedPdf.length.toLocaleString("en-IN")} bytes`],
    ["Hash algorithm", "SHA-256"],
    ["Hash value", seal.sha256],
    ["Produced by", "ChaanBean platform (computer system operated by ChaanBean)"],
    ["Sealed on", formatDateTimeIst(seal.sealed_at, true)],
    ["Parties", `${org.name} and ${cp.legal_name}`],
  ], 9);
  s63.gap();
  s63.para("I, ____________________ (name), ____________________ (designation) of ____________________, state that:", 9.5);
  [
    "The electronic record identified above was produced by the computer system named above during the period over which it was regularly used to store and process information for the activities regularly carried on over that period.",
    "During that period, information of the kind contained in the record was regularly fed into the computer system in the ordinary course of those activities.",
    "Throughout the material part of that period the computer system was operating properly, or, if not, any respect in which it was not operating properly did not affect the electronic record or the accuracy of its contents.",
    "The information contained in the electronic record reproduces or is derived from information fed into the computer system in the ordinary course of those activities.",
    "The hash value above was computed from the electronic record and matches the value recorded by the system at the time of sealing.",
  ].forEach((c, i) => s63.para(`${i + 1}. ${c}`, 9.5));
  s63.gap(10);
  s63.para("Place: ____________________     Date: ____________________", 9.5);
  s63.gap(10);
  s63.para("Signature: ____________________", 9.5);
  s63.gap();
  s63.heading("Part B (to be completed by an expert, where required)");
  s63.para("Left blank for the expert's certificate. Counsel will advise whether Part B is needed.", 9);
  files.push({ name: "5-section-63-certificate-DRAFT.pdf", bytes: await s63.save() });

  // 6. File list with hashes
  const manifest = [
    `ChaanBean evidence pack for ${seal.reference}`,
    `Generated ${formatDateTimeIst(now, true)} by ${ctx.user.id}`,
    `Sealed file SHA-256 (recorded at sealing): ${seal.sha256}`,
    "",
    "SHA-256  file",
    ...files.map((f) => `${sha(f.bytes)}  ${f.name}`),
    "",
    `Verify the sealed file at /v/${seal.reference} on ChaanBean.`,
    `Pack prepared on ${formatDate(now.toISOString().slice(0, 10))}.`,
  ].join("\n");
  files.push({ name: "6-files-and-hashes.txt", bytes: new TextEncoder().encode(manifest) });

  await audit(ctx, { action: `${kind}.evidence_downloaded`, entity: kind, entityId: id, after: { reference: seal.reference } });
  return { bytes: zip(files), name: `${seal.reference}-evidence-pack.zip` };
}
