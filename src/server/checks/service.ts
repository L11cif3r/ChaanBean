import "server-only";
import type { JSONValue } from "postgres";
import { istDate } from "@/lib/dates";
import { maskMobile } from "@/lib/mask";
import { isIndividualPan, isValidPan, normaliseIdentifier, normaliseMobile, panFromGstin } from "@/lib/validators";
import { CW_CHECKS, checkDef, isCwCode, unavailableReason, type CwCode } from "@/lib/checks";
import { CC_CODES, firCovered, isCcCode, type CaseCandidate, type CaseInput, type CcCode } from "@/lib/cases";
import {
  CONSENT_RULES, ageOn, consentDataHidden, recentDecline, reusableConsent, sendAllowance, type ConsentChannel, type ConsentPurpose, type ConsentStatus,
} from "@/lib/consent";
import type { CounterpartyType } from "@/lib/counterparties";
import { evaluateReport, type ReportInputs, type ReportOutcome } from "@/lib/report-rules";
import { audit } from "@/server/audit";
import { billingSummary, priceList } from "@/server/billing/service";
import { commitHold, placeHold, reverseHold } from "@/server/billing/charge";
import { decryptField, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { enqueue } from "@/server/jobs/runner";
import { checkProvider, checkProviderFor, type CheckSubject, type ConsentAccess } from "@/server/providers/checks";
import {
  consentAccessFor, consentHistory, consentsForRequest, counterpartyContacts, createConsent, logDataFetched, type ConsentOnReport,
} from "@/server/consent/service";
import { rawResponseStore } from "@/server/storage";
import { isSampleMode, isSampleProvider } from "@/server/sample";
import { caseProviderFor } from "@/server/providers/cases";
import { confirmedCases, storeMatches } from "@/server/cases/service";
import type { ProviderResult } from "@/server/providers/identity";
import type { RequestContext } from "@/server/context";

// Credit Worthiness engine (PRD v2.0 section 4; v1.0 FR-CW-01, 04–07, 12.4).
// Starting a request holds wallet money for every selected check, then each check runs as a background
// job: one retry after 2 seconds, then "Not available" with the hold reversed. Data that arrives (or a clean "nothing
// found") commits the hold. After every check the report's risk level and safe range are worked out again.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

/** Credit Worthiness and Case Check items share one engine (v3 6.4 "How a search runs (all tabs)"). */
export type ItemCode = CwCode | CcCode;
export type Tab = "credit_worthiness" | "case_check";

// v3 16.1: 15 s by default; GST turnover 30 s; court search up to 120 s.
const TIMEOUT_MS: Partial<Record<ItemCode, number>> = { CW_GST_TURNOVER_4Y: 30_000, CW_GST_TURNOVER_CY: 30_000, CC_COURT: 120_000, CC_FIR: 60_000 };
const DEFAULT_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 2_000;

type ItemStatus = "ready" | "queued" | "running" | "waiting_consent" | "success" | "no_data" | "not_available" | "cancelled";
const FINAL: ItemStatus[] = ["success", "no_data", "not_available", "cancelled"];

// ---------------------------------------------------------------- counterparty for checks

interface CpRow {
  id: string; type: CounterpartyType; legal_name: string; gstin: string | null; pan_ciphertext: string | null;
  cin: string | null; udyam: string | null; iec: string | null; state_code: string | null; status: "active" | "archived";
  contact_name: string | null; mobile_ciphertext: string | null; mobile_masked: string | null;
}

const CP_COLS = () => sql()`id, type, legal_name, gstin, pan_ciphertext, cin, udyam, iec, state_code, status, contact_name,
  mobile_ciphertext, mobile_masked`;

async function loadCounterparty(ctx: Ctx, id: string): Promise<CpRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("This counterparty");
  const [cp] = await sql()<CpRow[]>`select ${CP_COLS()} from public.counterparties where id = ${id} and org_id = ${ctx.orgId}`;
  if (!cp) throw notFound("This counterparty");
  return cp;
}

function subjectOf(cp: CpRow): CheckSubject {
  return {
    type: cp.type,
    gstin: cp.gstin,
    pan: cp.pan_ciphertext ? decryptField(cp.pan_ciphertext, "counterparties.pan") : null,
    cin: cp.cin,
    udyam: cp.udyam,
    iec: cp.iec,
    legalName: cp.legal_name,
    stateCode: cp.state_code,
  };
}

// ---------------------------------------------------------------- S08: what can be run and what it costs

export interface CatalogueEntry {
  code: ItemCode;
  name: string;
  group: (typeof CW_CHECKS)[number]["group"] | "cases";
  consent: boolean;
  pricePaise: number | null;
  gstPaise: number | null;
  /** Why the card is disabled, as a message key, or null. */
  disabled: string | null;
  recent: { requestId: string; at: string } | null;
}

export async function checkCatalogue(ctx: Ctx, counterpartyId: string, tab: Tab = "credit_worthiness") {
  if (tab === "case_check") return caseCatalogue(ctx, counterpartyId);
  const cp = await loadCounterparty(ctx, counterpartyId);
  const [usage, recent] = await Promise.all([
    priceList(ctx.orgId),
    sql()<{ item_code: string; request_id: string; fetched_at: Date }[]>`
      select distinct on (item_code) item_code, request_id, fetched_at
        from public.check_items
       where counterparty_id = ${cp.id} and org_id = ${ctx.orgId} and status in ('success', 'no_data')
       order by item_code, fetched_at desc`,
  ]);
  const s = subjectOf(cp);
  const ids = { type: cp.type, gstin: cp.gstin, pan: s.pan ?? (cp.gstin ? panFromGstin(cp.gstin) : null), cin: cp.cin, udyam: cp.udyam, iec: cp.iec, hasMobile: Boolean(cp.mobile_ciphertext) };
  const byCode = new Map(usage.map((u) => [u.code, u]));
  const entries: CatalogueEntry[] = CW_CHECKS.map((def) => {
    const u = byCode.get(def.code);
    const r = recent.find((x) => x.item_code === def.code);
    const fresh = r && Date.now() - r.fetched_at.getTime() < def.reuseDays * 86_400_000;
    const reason = cp.status === "archived" ? "archived" : unavailableReason(def.code, ids) ?? (!u ? "noPrice" : null);
    return {
      code: def.code,
      name: u?.name ?? def.code,
      group: def.group,
      consent: def.consent,
      pricePaise: u ? Number(u.pricePaise) : null,
      gstPaise: u ? Number(u.gstPaise) : null,
      disabled: reason,
      recent: fresh && r ? { requestId: r.request_id, at: r.fetched_at.toISOString() } : null,
    };
  });
  return {
    counterparty: { id: cp.id, name: cp.legal_name, type: cp.type, contactName: cp.contact_name, mobileMasked: cp.mobile_masked },
    checks: entries,
  };
}

/** v3 section 7: court case history, FIR check and money laundering check, each priced; none pre-ticked (FR-CC-01). */
async function caseCatalogue(ctx: Ctx, counterpartyId: string) {
  const [cp, usage] = await Promise.all([loadCounterparty(ctx, counterpartyId), priceList(ctx.orgId)]);
  const byCode = new Map(usage.map((u) => [u.code, u]));
  const entries: CatalogueEntry[] = CC_CODES.map((code) => {
    const u = byCode.get(code);
    return {
      code, name: u?.name ?? code, group: "cases", consent: false,
      pricePaise: u ? Number(u.pricePaise) : null, gstPaise: u ? Number(u.gstPaise) : null,
      disabled: cp.status === "archived" ? "archived" : !u ? "noPrice" : null,
      recent: null,
    };
  });
  return {
    counterparty: { id: cp.id, name: cp.legal_name, type: cp.type, contactName: cp.contact_name, mobileMasked: cp.mobile_masked },
    checks: entries,
  };
}

/** The search form pre-filled from the counterparty (S12 marker 1). PAN and mobile on file are used unless replaced. */
export async function caseDefaults(ctx: Ctx, counterpartyId: string) {
  const [cp] = await sql()<{ legal_name: string; state_code: string | null; city: string | null; address: { line?: string; line1?: string; line2?: string; city?: string; pincode?: string } | null; pan_masked: string | null; mobile_masked: string | null; type: CounterpartyType }[]>`
    select legal_name, state_code, city, address, pan_masked, mobile_masked, type::text as type
      from public.counterparties where id = ${counterpartyId} and org_id = ${ctx.orgId}`;
  if (!cp) throw notFound("This counterparty");
  const a = cp.address ?? {};
  return {
    name: cp.legal_name,
    state: cp.state_code ?? "",
    district: cp.city ?? a.city ?? "",
    address: [a.line ?? a.line1, a.line2, a.city, a.pincode].filter(Boolean).join(", "),
    panOnFile: cp.pan_masked,
    mobileOnFile: cp.mobile_masked,
    individual: cp.type === "individual",
  };
}

/** The person whose personal CIBIL is asked for (v3 6.2). Their OTP goes to their own mobile. */
export interface PersonInput {
  /** The buyer's contact person: same mobile, so one consent request covers everything. */
  sameAsContact: boolean;
  name: string;
  pan: string;
  birthDate: string;
  /** Needed when not the buyer's contact. */
  mobile?: string;
}

/** One person asked to say yes: the buyer's contact, or the person whose personal CIBIL is asked for. */
interface Subject {
  kind: "buyer" | "person";
  name: string;
  mobile10: string;
  scope: CwCode[];
  /** PAN and date of birth the requester entered, which the person confirms on the consent page. */
  expected: { pan: string; birthDate: string } | null;
}

function validatePerson(p: PersonInput | undefined, today: string): Record<string, string> {
  const f: Record<string, string> = {};
  if (!p) return { person: "Enter the details of the person whose personal CIBIL you want." };
  if (p.name.trim().length < 2) f["person.name"] = "Enter the person's name.";
  const pan = normaliseIdentifier(p.pan);
  if (!isValidPan(pan) || !isIndividualPan(pan)) f["person.pan"] = "Enter a personal PAN (the fourth letter is P).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) || p.birthDate > today) f["person.birthDate"] = "Enter a valid date.";
  else if (ageOn(p.birthDate, today) < 18) f["person.birthDate"] = "The person must be 18 or older.";
  if (!p.sameAsContact && !normaliseMobile(p.mobile ?? "")) f["person.mobile"] = "Enter a valid mobile number.";
  return f;
}

/** v3 6.2: who gets a consent request for which items. "Both" CIBIL asks two people when they differ. */
function subjectsFor(cp: CpRow, codes: CwCode[], person: PersonInput | undefined): Subject[] {
  const contactMobile = cp.mobile_ciphertext ? decryptField(cp.mobile_ciphertext, "counterparties.mobile") : null;
  const personMobile = person ? (person.sameAsContact ? contactMobile : normaliseMobile(person.mobile ?? "")!) : null;
  const personal = codes.includes("CW_CIBIL_PERSONAL");
  const expected = personal && person ? { pan: normaliseIdentifier(person.pan), birthDate: person.birthDate } : null;
  const together = !personal || personMobile === contactMobile;
  const buyerScope = codes.filter((c) => together || c !== "CW_CIBIL_PERSONAL");
  const out: Subject[] = [];
  if (buyerScope.length) {
    // v4: a buyer picked from search has no contact yet; checks the buyer approves by OTP need one.
    if (!contactMobile || !cp.contact_name) {
      throw new AppError("validation_failed", "Add the buyer's contact first: they approve this check by OTP.", { contact: "Add the buyer's contact name and mobile." });
    }
    out.push({ kind: "buyer", name: cp.contact_name, mobile10: contactMobile, scope: buyerScope, expected: together ? expected : null });
  }
  if (!together) out.push({ kind: "person", name: person!.name.trim(), mobile10: personMobile!, scope: ["CW_CIBIL_PERSONAL"], expected });
  return out;
}

export interface Quote {
  tab: Tab;
  /** Valid 10 minutes; "Yes, run search" passes it so what runs is what the popup showed (v3 section 10). */
  quoteId: string;
  expiresAt: string;
  /** Each item: price before GST, its GST and the total held from the wallet (v4 section 3: rupees only). */
  lines: { code: ItemCode; name: string; pricePaise: number; gstPaise: number; amountPaise: number }[];
  /** Totals: before GST, GST, and what the wallet pays. */
  pricePaise: number;
  gstPaise: number;
  walletPaise: number;
  walletBeforePaise: number;
  /** Sample data mode: nothing is taken from the wallet (v4 FR-MK-04). */
  sample: boolean;
  walletAfterPaise: number;
  enough: boolean;
  needsConsent: number;
  /** S09 rules for the items that need a yes; null when none do. */
  consent: ConsentQuote | null;
}

export interface SubjectQuote {
  kind: "buyer" | "person";
  name: string;
  mobileMasked: string;
  scope: CwCode[];
  /** An approved consent from the last 30 days covers these items, so this person is not asked again. */
  reuse: { approvedAt: string; id?: string } | null;
  /** They said no in the last 7 days: warn before asking again. */
  declinedAt: string | null;
  /** At most 3 requests in 7 days. */
  limitReached: boolean;
  nextAllowedAt: string | null;
}

export interface ConsentQuote {
  subjects: SubjectQuote[];
  /** Channels for the buyer's contact; a separate person is reached by SMS and WhatsApp. */
  whatsappMasked: string;
  emailMasked: string | null;
}

async function subjectQuotes(ctx: Ctx, cp: CpRow, subjects: Subject[]): Promise<SubjectQuote[]> {
  const now = new Date();
  return Promise.all(
    subjects.map(async (s) => {
      const history = await consentHistory(ctx.orgId, cp.id, s.mobile10);
      const reuse = reusableConsent(history, s.scope, now);
      const allowance = sendAllowance(history.map((h) => h.createdAt), now);
      const declined = recentDecline(history, now);
      return {
        kind: s.kind, name: s.name, mobileMasked: maskMobile(s.mobile10), scope: s.scope,
        reuse: reuse ? { approvedAt: reuse.approvedAt!.toISOString(), id: reuse.id } : null,
        declinedAt: declined?.toISOString() ?? null,
        limitReached: !reuse && !allowance.allowed,
        nextAllowedAt: allowance.nextAt?.toISOString() ?? null,
      };
    }),
  );
}

async function consentQuote(ctx: Ctx, cp: CpRow, codes: CwCode[], person: PersonInput | undefined): Promise<ConsentQuote> {
  const [subjects, contacts] = await Promise.all([subjectQuotes(ctx, cp, subjectsFor(cp, codes, person)), counterpartyContacts(ctx.orgId, cp.id)]);
  return {
    subjects: subjects.map((s) => ({ ...s, reuse: s.reuse ? { approvedAt: s.reuse.approvedAt } : null })),
    whatsappMasked: contacts.whatsapp_masked ?? cp.mobile_masked ?? "",
    emailMasked: contacts.email_masked,
  };
}

/** v3 Figure 5: exactly what will be deducted before the search runs. Mirrors place_hold's plan-then-wallet rule. */
export async function quoteChecks(
  ctx: Ctx, counterpartyId: string, codes: string[], person?: PersonInput,
  /** One check of a request that already has its yes (one-by-one runs): no consent step to quote. */
  opts: { consentSettled?: boolean; tab?: Tab } = {},
): Promise<Quote> {
  const tab = opts.tab ?? "credit_worthiness";
  const [{ checks }, cp, summary] = await Promise.all([
    checkCatalogue(ctx, counterpartyId, tab), loadCounterparty(ctx, counterpartyId), billingSummary(ctx.orgId),
  ]);
  const selected = validateSelection(checks, codes);
  const consentCodes = selected.filter((c) => c.consent).map((c) => c.code as CwCode);
  if (consentCodes.includes("CW_CIBIL_PERSONAL") && !opts.consentSettled) {
    const f = validatePerson(person, istDate(new Date()));
    if (Object.keys(f).length) throw new AppError("validation_failed", "Please check the person's details.", f);
  }
  const lines = selected.map((c) => ({
    code: c.code,
    name: c.name,
    pricePaise: c.pricePaise ?? 0,
    gstPaise: c.gstPaise ?? 0,
    amountPaise: (c.pricePaise ?? 0) + (c.gstPaise ?? 0),
  }));
  const sample = await isSampleMode(ctx.orgId);
  const walletPaise = sample ? 0 : lines.reduce((s, l) => s + l.amountPaise, 0);
  const wallet = Number(summary.walletPaise);
  const [q] = await sql()<{ id: string; expires_at: Date }[]>`
    insert into app_private.check_quotes (org_id, counterparty_id, items, lines, created_by)
    values (${ctx.orgId}, ${counterpartyId}, ${selected.map((c) => c.code)}, ${sql().json(lines)}, ${ctx.user.id})
    returning id, expires_at`;
  return {
    tab,
    quoteId: q.id,
    expiresAt: q.expires_at.toISOString(),
    lines,
    pricePaise: lines.reduce((s, l) => s + l.pricePaise, 0),
    gstPaise: lines.reduce((s, l) => s + l.gstPaise, 0),
    walletPaise,
    walletBeforePaise: wallet,
    sample,
    walletAfterPaise: wallet - walletPaise,
    enough: wallet >= walletPaise,
    needsConsent: consentCodes.length,
    consent: consentCodes.length && !opts.consentSettled ? await consentQuote(ctx, cp, consentCodes, person) : null,
  };
}

/** The quote the popup showed: this organisation's, unused, not expired, for exactly these items. */
async function claimQuote(ctx: Ctx, quoteId: string, counterpartyId: string, codes: string[]) {
  const [q] = await sql()<{ items: string[] }[]>`
    update app_private.check_quotes set used_at = now()
     where id = ${quoteId} and org_id = ${ctx.orgId} and counterparty_id = ${counterpartyId} and used_at is null and expires_at > now()
     returning items`;
  const same = q && q.items.length === new Set(codes).size && q.items.every((c) => codes.includes(c));
  if (!same) throw new AppError("conflict", "The cost may have changed or the popup was open too long. Please check the cost again.");
}

function validateSelection(checks: CatalogueEntry[], codes: string[]) {
  const unique = [...new Set(codes)];
  if (!unique.length) throw new AppError("validation_failed", "Select at least one check.", { items: "Select at least one check." });
  return unique.map((code) => {
    const c = isCwCode(code) || isCcCode(code) ? checks.find((x) => x.code === code) : undefined;
    if (!c) throw new AppError("bad_request", "This check is not available.");
    if (c.disabled) throw new AppError("conflict", `${c.name} cannot run for this counterparty right now.`);
    return c;
  });
}

// ---------------------------------------------------------------- start a request ("Yes, run search")

export interface StartInput {
  tab?: Tab;
  /** Case Check search details (S12 fields). */
  caseInput?: CaseInput;
  quoteId: string;
  counterpartyId: string;
  items: string[];
  mode: "together" | "manual";
  /** Needed when a selected check needs a yes and no recent consent covers it (S09 markers 3 and 4). */
  consent?: { purpose: ConsentPurpose; channels: ConsentChannel[] };
  /** Needed for personal CIBIL (v3 6.2). */
  person?: PersonInput;
  /** The multiple search this request belongs to (v4 section 7). */
  bulkId?: string;
}

export async function startChecks(
  ctx: Ctx, input: StartInput, origin: string, idempotencyKey: string | null,
  /** Multiple search: create now, start all together with releaseRequests once every row is created. */
  opts: { defer?: boolean } = {},
) {
  const db = sql();
  if (idempotencyKey) {
    const [again] = await db<{ id: string; report_no: string }[]>`
      select id, report_no from public.check_requests where org_id = ${ctx.orgId} and idempotency_key = ${idempotencyKey}`;
    if (again) return { id: again.id, reportNo: again.report_no };
  }
  const tab = input.tab ?? "credit_worthiness";
  const [{ checks }, cp] = await Promise.all([checkCatalogue(ctx, input.counterpartyId, tab), loadCounterparty(ctx, input.counterpartyId)]);
  const selected = validateSelection(checks, input.items);
  const consentCodes = selected.filter((c) => c.consent).map((c) => c.code as CwCode);
  if (tab === "case_check") {
    if (!input.caseInput) throw new AppError("validation_failed", "Enter the details to search.", { name: "Enter a name." });
    if (selected.some((c) => c.code === "CC_FIR") && !firCovered(input.caseInput.state)) {
      throw new AppError("validation_failed", "FIR records are not available for this state.", { state: "FIR check does not cover this state." });
    }    // S12: PAN and mobile on file improve matching when the user does not enter others.
    const onFile = subjectOf(cp);
    input.caseInput = {
      ...input.caseInput,
      pan: input.caseInput.pan ?? onFile.pan ?? (cp.gstin ? panFromGstin(cp.gstin) : undefined),
      mobile: input.caseInput.mobile ?? (cp.mobile_ciphertext ? decryptField(cp.mobile_ciphertext, "counterparties.mobile") : undefined),
    };
  }
  if (consentCodes.includes("CW_CIBIL_PERSONAL")) {
    const f = validatePerson(input.person, istDate(new Date()));
    if (Object.keys(f).length) throw new AppError("validation_failed", "Please check the person's details.", f);
  }

  // S09 rules per person asked: use a recent yes again, else respect the 3-in-7-days limit and ask how to reach them.
  const subjects = subjectsFor(cp, consentCodes, input.person);
  const quotes = await subjectQuotes(ctx, cp, subjects);
  const toAsk = subjects.filter((_, i) => !quotes[i].reuse);
  if (toAsk.length && !input.consent) {
    throw new AppError("validation_failed", "Choose how to send the consent request.", { channels: "Choose at least one way to send the request." });
  }
  const blocked = quotes.find((q) => q.limitReached);
  if (blocked) {
    throw new AppError("rate_limited", `You have sent 3 requests to ${blocked.name} in the last 7 days. You can send the next one after ${istDate(new Date(blocked.nextAllowedAt!))}.`);
  }
  await claimQuote(ctx, input.quoteId, input.counterpartyId, selected.map((c) => c.code));

  // v4 section 8: the request waits CANCEL_WINDOW_SECONDS before anything is held, asked or run. Cancelling inside the
  // window leaves no ledger entry; the server starts it after the window even if the app is closed.
  const startAt = new Date(Date.now() + (opts.defer ? 3_600_000 : cancelWindowMs()));
  const secret = input.caseInput || input.person ? encryptField(JSON.stringify({ case: input.caseInput ?? null, person: input.person ?? null }), "check_requests.inputs") : null;
  const [{ report_no }] = await db<{ report_no: string }[]>`select app_private.next_report_no() as report_no`;
  const [req] = await db<{ id: string }[]>`
    insert into public.check_requests (org_id, counterparty_id, report_no, run_mode, created_by, quote_id, idempotency_key, tab,
                                       inputs_ciphertext, inputs_summary, status, start_at, origin, consent_input, bulk_id)
    values (${ctx.orgId}, ${input.counterpartyId}, ${report_no}, ${input.mode}, ${ctx.user.id}, ${input.quoteId}, ${idempotencyKey}, ${tab},
            ${secret}, ${db.json(input.caseInput ? { name: input.caseInput.name, state: input.caseInput.state, district: input.caseInput.district } : {})},
            'pending_start', ${startAt}, ${origin}, ${input.consent ? db.json(input.consent) : null}, ${input.bulkId ?? null})
    returning id`;
  const reusedFor = (code: ItemCode) => quotes.find((q) => q.reuse && (q.scope as ItemCode[]).includes(code))?.reuse?.id ?? null;
  const waitsForBuyer = (c: CatalogueEntry) => c.consent && !reusedFor(c.code);
  await db`
    insert into public.check_items ${db(
      selected.map((c) => ({
        org_id: ctx.orgId,
        request_id: req.id,
        counterparty_id: input.counterpartyId,
        item_code: c.code,
        needs_consent: c.consent,
        consent_id: c.consent ? reusedFor(c.code) : null,
        status: waitsForBuyer(c) ? "waiting_consent" : input.mode === "together" ? "queued" : "ready",
        options: db.json(c.code === "CW_CIBIL_PERSONAL" && input.person ? { subjectName: input.person.name.trim() } : {}),
      })),
    )}`;
  if (!opts.defer) await enqueue("checks.begin", { requestId: req.id }, { orgId: ctx.orgId, runAt: startAt, dedupeKey: `checks.begin:${req.id}` });
  await audit(ctx, {
    action: tab === "case_check" ? "case_check.confirmed" : "check.confirmed",
    entity: "check_request",
    entityId: req.id,
    after: { reportNo: report_no, counterpartyId: input.counterpartyId, items: selected.map((c) => c.code), mode: input.mode, startAt: startAt.toISOString() },
  });
  return { id: req.id, reportNo: report_no, startAt: startAt.toISOString(), cancelWindowSeconds: cancelWindowMs() / 1000 };
}

/** Starts deferred requests together: one cancel window for the whole multiple search (v4 sections 7 and 8). */
export async function releaseRequests(ctx: Ctx, ids: string[]) {
  if (!ids.length) return null;
  const startAt = new Date(Date.now() + cancelWindowMs());
  await sql()`update public.check_requests set start_at = ${startAt} where org_id = ${ctx.orgId} and id in ${sql()(ids)} and status = 'pending_start'`;
  await Promise.all(ids.map((id) => enqueue("checks.begin", { requestId: id }, { orgId: ctx.orgId, runAt: startAt, dedupeKey: `checks.begin:${id}` })));
  return { startAt: startAt.toISOString(), cancelWindowSeconds: cancelWindowMs() / 1000 };
}

/** Seconds to cancel after "Yes, run search" (v4 FR-PAY-02; Ops setting, default 3). */
export const cancelWindowMs = () => Math.min(15, Math.max(1, Number(process.env.CANCEL_WINDOW_SECONDS ?? 3) || 3)) * 1000;

/** v4 FR-PAY-03: cancel inside the window. Nothing was held, sent or run, so there is nothing to give back. */
export async function cancelChecks(ctx: Ctx, requestId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw notFound("This search");
  const db = sql();
  const [r] = await db<{ id: string; tab: Tab }[]>`
    update public.check_requests set status = 'cancelled', completed_at = now(), start_error = 'Cancelled before it started. Nothing charged.'
     where id = ${requestId} and org_id = ${ctx.orgId} and status = 'pending_start' and start_at > now()
     returning id, tab`;
  if (!r) throw new AppError("conflict", "It has already started. You pay only for data that arrives.");
  await db`update public.check_items set status = 'cancelled', error_message = 'Cancelled before it started. Not charged.' where request_id = ${requestId}`;
  await audit(ctx, { action: r.tab === "case_check" ? "case_check.cancelled" : "check.cancelled", entity: "check_request", entityId: requestId });
  return { cancelled: true };
}

/**
 * Job checks.begin, after the cancel window: hold the money (not in sample data mode), send the consent requests and
 * queue the checks. Runs once; a cancelled request is left alone.
 */
export async function beginChecks(requestId: string) {
  const db = sql();
  const [req] = await db<{ id: string; org_id: string; counterparty_id: string; created_by: string | null; run_mode: "together" | "manual"; tab: Tab; origin: string | null; consent_input: StartInput["consent"] | null; inputs_ciphertext: string | null; start_at: Date }[]>`
    update public.check_requests set status = 'in_progress'
     where id = ${requestId} and status = 'pending_start' and start_at <= now()
     returning id, org_id, counterparty_id, created_by, run_mode, tab, origin, consent_input, inputs_ciphertext, start_at`;
  if (!req) {
    const [still] = await db<{ start_at: Date }[]>`select start_at from public.check_requests where id = ${requestId} and status = 'pending_start'`;
    if (still) await enqueue("checks.begin", { requestId }, { orgId: undefined, runAt: still.start_at, dedupeKey: `checks.begin:${requestId}:again` });
    return;
  }
  const ctx = await jobCtx(req.org_id, req.created_by, `begin-${requestId.slice(0, 8)}`);
  const sample = await isSampleMode(req.org_id);
  const items = await db<{ id: string; item_code: ItemCode; status: ItemStatus; needs_consent: boolean; consent_id: string | null }[]>`
    select id, item_code, status, needs_consent, consent_id from public.check_items where request_id = ${requestId}`;
  const placed: string[] = [];
  try {
    if (!ctx) throw new AppError("forbidden", "The person who started this search can no longer run checks.");
    if (req.run_mode === "together" && !sample) {
      const holds = await Promise.allSettled(
        items.map((item) => holdFor(ctx, requestId, item.id, item.item_code, item.status === "waiting_consent" ? CONSENT_HOLD_MS : undefined)),
      );
      for (const h of holds) if (h.status === "fulfilled") placed.push(h.value);
      const failed = holds.find((h) => h.status === "rejected");
      if (failed) throw failed.reason;
    }
    const waiting = items.filter((i) => i.status === "waiting_consent" && !i.consent_id).map((i) => i.item_code as CwCode);
    if (waiting.length) {
      if (!req.consent_input) throw new AppError("validation_failed", "Choose how to send the consent request.");
      const cp = await loadCounterparty(ctx, req.counterparty_id);
      const secret = req.inputs_ciphertext ? JSON.parse(decryptField(req.inputs_ciphertext, "check_requests.inputs")) as { person: PersonInput | null } : null;
      const subjects = subjectsFor(cp, waiting, secret?.person ?? undefined);
      for (const subj of subjects) {
        const consent = await createConsent(ctx, {
          checkRequestId: requestId, counterpartyId: req.counterparty_id, scope: subj.scope, purpose: req.consent_input.purpose,
          channels: subj.kind === "person" ? req.consent_input.channels.filter((c) => c !== "email") : req.consent_input.channels,
          origin: req.origin ?? process.env.APP_URL ?? "", subject: subj,
        });
        await db`update public.check_items set consent_id = ${consent.id} where request_id = ${requestId} and item_code in ${db(subj.scope)}`;
      }
    }
  } catch (e) {
    // Not enough money, or the consent request could not be sent: give back what was held and stop.
    await Promise.all(placed.map((holdId) => reverseHold(req.org_id, holdId, "Search not started", "system", `begin:${requestId}`)));
    const message = (e instanceof AppError ? e.message : "The search could not start. Nothing charged.").slice(0, 300);
    await db`update public.check_requests set status = 'cancelled', completed_at = now(), start_error = ${message} where id = ${requestId}`;
    await db`update public.check_items set status = 'cancelled', error_message = ${message} where request_id = ${requestId}`;
    return;
  }
  await Promise.all(
    items
      .filter((item) => item.status === "queued")
      .map((item) => enqueue("checks.run_item", { itemId: item.id }, { orgId: req.org_id, dedupeKey: `checks.run_item:${item.id}` })),
  );
  if (ctx) {
    await audit(ctx, {
      action: req.tab === "case_check" ? "case_check.started" : "check.started", entity: "check_request", entityId: requestId,
      after: { sample, held: placed.length },
    });
  }
  await refreshReport(requestId);
}

/** The person who started a request, as a context for work done later by a job. Null if they left the organisation. */
export async function jobCtx(orgId: string, userId: string | null, requestId: string): Promise<Ctx | null> {
  if (!userId) return null;
  const [m] = await sql()<{ role: Ctx["role"] }[]>`select role::text as role from public.memberships where org_id = ${orgId} and user_id = ${userId} and status = 'active'`;
  return m ? { requestId, ip: null, userAgent: null, user: { id: userId, phone: null, email: null }, orgId, role: m.role, memberships: [] } : null;
}

/** A check waiting for a yes keeps its hold until the link expires, plus time for the check to run. */
const CONSENT_HOLD_MS = CONSENT_RULES.linkMs + 3600_000;

async function holdFor(ctx: Ctx, requestId: string, itemId: string, code: ItemCode, keepMs?: number) {
  const hold = await placeHold({
    orgId: ctx.orgId, itemCode: code, refType: "check_request", refId: requestId, idempotencyKey: `check:${itemId}`,
    actorId: ctx.user.id, requestId: ctx.requestId, expiresAt: keepMs ? new Date(Date.now() + keepMs) : undefined,
  });
  await sql()`update public.check_items set hold_id = ${hold.id} where id = ${itemId}`;
  return hold.id;
}

/** The cost popup for one check of a one-by-one request (v3 FR-CW-05: each run has its own popup). */
export async function quoteOne(ctx: Ctx, requestId: string, code: string) {
  const [item] = await sql()<{ counterparty_id: string; status: ItemStatus; tab: Tab }[]>`
    select i.counterparty_id, i.status, r.tab from public.check_items i join public.check_requests r on r.id = i.request_id
     where i.request_id = ${requestId} and i.org_id = ${ctx.orgId} and i.item_code = ${code}`;
  if (!item) throw notFound("This check");
  if (item.status !== "ready") throw new AppError("conflict", item.status === "waiting_consent" ? "This check can run once the buyer says yes." : "This check has already started.");
  return quoteChecks(ctx, item.counterparty_id, [code], undefined, { consentSettled: true, tab: item.tab });
}

/** "I will run each one myself": start one check of a manual request, after its own cost popup (v3 FR-CW-05). */
export async function runOne(ctx: Ctx, requestId: string, code: string, quoteId: string) {
  const [item] = await sql()<{ id: string; item_code: ItemCode; status: ItemStatus; counterparty_id: string }[]>`
    select i.id, i.item_code, i.status, i.counterparty_id from public.check_items i
     where i.request_id = ${requestId} and i.org_id = ${ctx.orgId} and i.item_code = ${code}`;
  if (!item) throw notFound("This check");
  if (item.status === "waiting_consent") throw new AppError("conflict", "This check can run once the buyer says yes.");
  if (item.status !== "ready") throw new AppError("conflict", "This check has already started.");
  await claimQuote(ctx, quoteId, item.counterparty_id, [item.item_code]);
  if (!(await isSampleMode(ctx.orgId))) await holdFor(ctx, requestId, item.id, item.item_code);
  const [claimed] = await sql()<{ id: string }[]>`
    update public.check_items set status = 'queued' where id = ${item.id} and status = 'ready' returning id`;
  if (claimed) await enqueue("checks.run_item", { itemId: item.id }, { orgId: ctx.orgId, dedupeKey: `checks.run_item:${item.id}` });
  return { started: true };
}

// ---------------------------------------------------------------- run one check (job checks.run_item)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function runCheckItem(itemId: string) {
  const db = sql();
  const [item] = await db<{ id: string; org_id: string; request_id: string; counterparty_id: string; item_code: ItemCode; hold_id: string | null; status: ItemStatus; consent_id: string | null; needs_consent: boolean }[]>`
    update public.check_items set status = 'running', started_at = coalesce(started_at, now())
     where id = ${itemId} and status in ('queued', 'running')
     returning id, org_id, request_id, counterparty_id, item_code, hold_id, status, consent_id, needs_consent`;
  if (!item) return; // already finished or not started

  // A consent check runs only while the buyer's yes stands (they may have withdrawn since it was queued).
  let consent: ConsentAccess | null = null;
  if (item.needs_consent) {
    const c = item.consent_id ? await consentAccessFor(item.consent_id) : null;
    if (!c || c.status !== "approved") {
      const message = "The buyer withdrew consent before this check ran. Not charged.";
      if (item.hold_id) await reverseHold(item.org_id, item.hold_id, message, "system", `check:${item.id}`);
      await db`
        update public.check_items set status = 'cancelled', charged = false, error_code = 'CONSENT_WITHDRAWN', error_message = ${message}, fetched_at = now()
         where id = ${item.id}`;
      await refreshReport(item.request_id);
      return;
    }
    consent = c.access;
  }

  const today = istDate(new Date());
  const sample = await isSampleMode(item.org_id);
  // Case Check items search with the details entered on S12; Credit Worthiness items use the counterparty record.
  let caseInput: CaseInput | null = null;
  let run: () => Promise<ProviderOutcome>;
  let providerName: string;
  if (isCcCode(item.item_code)) {
    const [r] = await db<{ inputs_ciphertext: string | null }[]>`select inputs_ciphertext from public.check_requests where id = ${item.request_id}`;
    const saved = JSON.parse(decryptField(r.inputs_ciphertext!, "check_requests.inputs")) as { case?: CaseInput } & CaseInput;
    caseInput = saved.case ?? saved; // since v4 the inputs hold { case, person }
    const provider = caseProviderFor(sample);
    const code = item.item_code;
    providerName = provider.name;
    run = () => provider.run(code, caseInput!, { today });
  } else {
    const [cp] = await db<CpRow[]>`select ${CP_COLS()} from public.counterparties where id = ${item.counterparty_id}`;
    const provider = checkProviderFor(sample);
    const code = item.item_code;
    providerName = provider.name;
    run = () => provider.run(code, subjectOf(cp), { today, consent });
  }
  let result: ProviderOutcome | null = null;
  let error = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    await db`update public.check_items set attempts = attempts + 1 where id = ${item.id}`;
    try {
      result = await withTimeout(run(), TIMEOUT_MS[item.item_code] ?? DEFAULT_TIMEOUT_MS);
      if (result.status === "success" || result.status === "no_data") break;
      error = result.error?.message ?? "Source unavailable";
      if (result.error?.retryable === false) break; // a wrong input: trying again gives the same answer (v3 16.1)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      result = null;
    }
    if (attempt === 1) await sleep(RETRY_DELAY_MS);
  }

  const arrived = result && (result.status === "success" || result.status === "no_data");
  if (item.consent_id) await logDataFetched(item.consent_id, item.item_code, Boolean(arrived));
  let rawRef: string | null = null;
  if (result) {
    try {
      rawRef = await rawResponseStore.put(`checks/${item.request_id}/${item.id}-${Date.now()}.json`, result.raw);
    } catch {
      rawRef = null; // the normalised result still counts; the raw copy is for audit
    }
  }

  if (arrived && caseInput) {
    // Each possible match becomes a row with Chaanbean's own confidence; the item keeps the counts.
    result!.data = await storeMatches(item, caseInput, (result!.data as { matches: CaseCandidate[] } | undefined)?.matches ?? []);
  }
  if (arrived) {
    if (item.hold_id) await commitHold(item.org_id, item.hold_id, "system", `check:${item.id}`);
    await db`
      update public.check_items
         set status = ${result!.status}::public.check_item_status, charged = ${Boolean(item.hold_id)}, provider = ${result!.provider},
             data = ${result!.data === undefined ? null : db.json(result!.data as JSONValue)}, raw_ref = ${rawRef},
             fetched_at = now(), error_code = ${result!.error?.code ?? null}, error_message = ${result!.error?.message ?? null}
       where id = ${item.id}`;
  } else {
    const note = result?.error?.code === "TOO_MANY_MATCHES" ? "Too many possible matches. Not charged." : "Not available from source. Not charged.";
    if (item.hold_id) await reverseHold(item.org_id, item.hold_id, note, "system", `check:${item.id}`);
    await db`
      update public.check_items
         set status = 'not_available', charged = false, provider = ${result?.provider ?? providerName}, raw_ref = ${rawRef},
             fetched_at = now(), error_code = ${result?.error?.code ?? "TIMEOUT"}, error_message = ${error.slice(0, 300)}
       where id = ${item.id}`;
  }
  await refreshReport(item.request_id);
}

type ProviderOutcome = ProviderResult<unknown> & { raw: unknown };

// ---------------------------------------------------------------- report (S11)

interface ItemRow {
  id: string; item_code: CwCode; status: ItemStatus; needs_consent: boolean; charged: boolean; provider: string | null;
  data: unknown; error_code: string | null; error_message: string | null; fetched_at: Date | null; attempts: number;
  consent_id: string | null; consent_status: ConsentStatus | null; visible_until: Date | null; options: { subjectName?: string };
}

const itemRows = (requestId: string) => sql()<ItemRow[]>`
  select i.id, i.item_code, i.status, i.needs_consent, i.charged, i.provider, i.data, i.error_code, i.error_message, i.fetched_at,
         i.attempts, i.consent_id, c.status as consent_status, c.visible_until, i.options
    from public.check_items i left join public.consent_requests c on c.id = i.consent_id
   where i.request_id = ${requestId} order by i.created_at`;

/** Data fetched under a consent leaves the requester's view when the buyer withdraws or the 30 days end (FR-CON-06). */
const hiddenWhy = (i: ItemRow, now = new Date()) =>
  i.needs_consent && i.consent_status ? consentDataHidden({ status: i.consent_status, visibleUntil: i.visible_until }, now) : null;

const visible = (items: ItemRow[]) => items.map((i) => (hiddenWhy(i) ? { ...i, data: null, status: "cancelled" as ItemStatus } : i));

function inputsFrom(items: ItemRow[]): ReportInputs {
  const ok = (code: CwCode) => items.find((i) => i.item_code === code && i.status === "success")?.data ?? null;
  return {
    gst: ok("CW_GST_SEARCH") as ReportInputs["gst"],
    company: ok("CW_COMPANY") as ReportInputs["company"],
    directors: ok("CW_DIRECTORS") as ReportInputs["directors"],
    rating: ok("CW_CREDIT_RATING") as ReportInputs["rating"],
    turnover: ok("CW_GST_TURNOVER_4Y") as ReportInputs["turnover"],
    turnoverCurrentYear: ok("CW_GST_TURNOVER_CY") as ReportInputs["turnoverCurrentYear"],
    cibil: [ok("CW_CIBIL_COMPANY"), ok("CW_CIBIL_PERSONAL")].filter(Boolean) as NonNullable<ReportInputs["cibil"]>,
    msme: ok("CW_MSME") as ReportInputs["msme"],
    cases: null, // filled from confirmed Case Check matches by the caller
    today: istDate(new Date()),
  };
}

/** Works out the risk level and range again and marks the request complete or partial once every check is done. */
export async function refreshReport(requestId: string) {
  const db = sql();
  const [[req], items] = await Promise.all([
    db<{ tab: Tab; counterparty_id: string }[]>`select tab, counterparty_id from public.check_requests where id = ${requestId}`,
    itemRows(requestId),
  ]);
  const [cur] = await db<{ status: string }[]>`select status::text as status from public.check_requests where id = ${requestId}`;
  if (cur?.status === "pending_start" || cur?.status === "cancelled") return null;
  const done = items.every((i) => FINAL.includes(i.status));
  const status = !done ? "in_progress" : items.some((i) => i.status === "not_available" || i.status === "cancelled") ? "partial" : "complete";
  if (req?.tab === "case_check") {
    await db`
      update public.check_requests set status = ${status}::public.check_request_status,
             completed_at = ${done ? db`coalesce(completed_at, now())` : null}
       where id = ${requestId}`;
    return null;
  }
  const outcome = evaluateReport({ ...inputsFrom(visible(items)), cases: await confirmedCases(req.counterparty_id) });
  await db`
    update public.check_requests
       set risk_level = ${outcome.level}::public.risk_level,
           credit_low_paise = ${outcome.range?.lowPaise ?? null}, credit_high_paise = ${outcome.range?.highPaise ?? null},
           summary = ${db.json(outcome as unknown as JSONValue)},
           status = ${status}::public.check_request_status,
           completed_at = ${done ? db`coalesce(completed_at, now())` : null}
     where id = ${requestId}`;
  return outcome;
}

export interface ReportView {
  id: string;
  reportNo: string;
  counterparty: { id: string; name: string; type: CounterpartyType; gstin: string | null };
  runMode: "together" | "manual";
  status: "pending_start" | "in_progress" | "complete" | "partial" | "cancelled";
  /** While pending_start: when it starts (v4 cancel window). */
  startAt: string | null;
  /** Why it did not start (cancelled in the window, or not enough money). */
  startError: string | null;
  createdAt: string;
  validUntil: string;
  expired: boolean;
  outcome: ReportOutcome;
  items: {
    code: CwCode; name: string; status: ItemStatus; charged: boolean; provider: string | null; data: unknown; error: string | null;
    errorCode: string | null; fetchedAt: string | null; needsConsent: boolean; consentId: string | null;
    /** Fetched, but no longer shown: the buyer withdrew or the 30 days ended. */
    hidden: "withdrawn" | "lapsed" | null;
    /** Personal CIBIL: whose report it is. */
    subjectName: string | null;
  }[];
  consents: ConsentOnReport[];
  testData: boolean;
}

export async function getReport(ctx: Ctx, id: string): Promise<ReportView> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("This report");
  const db = sql();
  const [r] = await db<{
    id: string; report_no: string; run_mode: "together" | "manual"; status: ReportView["status"]; created_at: Date; valid_until: Date;
    counterparty_id: string; legal_name: string; type: CounterpartyType; gstin: string | null; start_at: Date | null; start_error: string | null;
  }[]>`
    select r.id, r.report_no, r.run_mode, r.status, r.created_at, r.valid_until, c.id as counterparty_id, c.legal_name, c.type, c.gstin,
           r.start_at, r.start_error
      from public.check_requests r join public.counterparties c on c.id = r.counterparty_id
     where r.id = ${id} and r.org_id = ${ctx.orgId} and r.tab = 'credit_worthiness'`;
  if (!r) throw notFound("This report");
  const [items, names, consents] = await Promise.all([
    itemRows(id),
    db<{ code: string; name: string }[]>`select code, name from public.billing_items`,
    consentsForRequest(ctx.orgId, id),
  ]);
  const order = CW_CHECKS.map((c) => c.code as string);
  return {
    id: r.id,
    reportNo: r.report_no,
    counterparty: { id: r.counterparty_id, name: r.legal_name, type: r.type, gstin: r.gstin },
    runMode: r.run_mode,
    status: r.status,
    startAt: r.status === "pending_start" ? r.start_at?.toISOString() ?? null : null,
    startError: r.start_error,
    createdAt: r.created_at.toISOString(),
    validUntil: r.valid_until.toISOString(),
    expired: r.valid_until.getTime() < Date.now(),
    outcome: evaluateReport({ ...inputsFrom(visible(items)), cases: await confirmedCases(r.counterparty_id) }),
    items: items
      .sort((a, b) => order.indexOf(a.item_code) - order.indexOf(b.item_code))
      .map((i) => {
        const hidden = hiddenWhy(i);
        return {
          code: i.item_code,
          name: names.find((n) => n.code === i.item_code)?.name ?? i.item_code,
          status: i.status,
          charged: i.charged,
          provider: i.provider,
          data: hidden ? null : i.data,
          error: i.error_message,
          errorCode: i.error_code,
          fetchedAt: i.fetched_at?.toISOString() ?? null,
          needsConsent: i.needs_consent,
          consentId: i.consent_id,
          hidden,
          subjectName: i.options?.subjectName ?? null,
        };
      }),
    consents,
    // "Test data" when any section came from a dummy provider.
    // "SAMPLE DATA: not a real report" when any section came from sample data (v4 FR-MK-03).
    testData: items.some((i) => isSampleProvider(i.provider)) || (items.every((i) => !i.provider) && (await isSampleMode(ctx.orgId) || checkProvider().isMock)),
  };
}

/** S07 Reports tab and the counterparty header. */
export async function reportsFor(ctx: Ctx, counterpartyId: string) {
  const rows = await sql()<{ id: string; report_no: string; status: ReportView["status"]; risk_level: ReportOutcome["level"] | null; credit_low_paise: string | null; credit_high_paise: string | null; created_at: Date; valid_until: Date; items: number }[]>`
    select r.id, r.report_no, r.status, r.risk_level, r.credit_low_paise, r.credit_high_paise, r.created_at, r.valid_until,
           (select count(*)::int from public.check_items i where i.request_id = r.id) as items
      from public.check_requests r where r.org_id = ${ctx.orgId} and r.counterparty_id = ${counterpartyId} and r.tab = 'credit_worthiness'
     order by r.created_at desc limit 50`;
  return rows.map((r) => ({
    id: r.id, reportNo: r.report_no, status: r.status, riskLevel: r.risk_level,
    creditLowPaise: r.credit_low_paise === null ? null : Number(r.credit_low_paise),
    creditHighPaise: r.credit_high_paise === null ? null : Number(r.credit_high_paise),
    createdAt: r.created_at.toISOString(), validUntil: r.valid_until.toISOString(), items: r.items,
  }));
}

export const isCheckCode = (code: string) => Boolean(checkDef(code));
