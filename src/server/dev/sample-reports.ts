import "server-only";
import crypto from "node:crypto";
import type { JSONValue } from "postgres";
import type { CwCode } from "@/lib/checks";
import { addDays, istDate } from "@/lib/dates";
import { maskMobile, maskPan } from "@/lib/mask";
import { gstinChecksumChar, panFromGstin } from "@/lib/validators";
import { blindIndex, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { mockIdentityProvider } from "@/server/providers/identity/mock";
import { mockCheckProvider } from "@/server/providers/checks";
import { refreshReport } from "@/server/checks/service";
import type { RequestContext } from "@/server/context";

// Development only: fills Credit Worthiness with sample companies and reports so the history list, its filters and
// the reports can be seen with every risk level. Each company is added as a normal counterparty (tag "sample data") and
// each report's sections come from the dummy provider, with dates spread over the last three months; the risk level
// and safe range are worked out by the real report rules. Nothing is charged for the sample checks.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

export const SAMPLE_TAG = "sample data";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const rnd = (s: string) => s[crypto.randomInt(s.length)];

/** A valid GSTIN with a chosen 13th character (dummy GST scenario) and, if asked, a chosen last character (CIBIL/turnover). */
function sampleGstin(state: string, entity: string, last?: string): string {
  for (let i = 0; i < 5000; i++) {
    const pan = `${rnd(LETTERS)}${rnd(LETTERS)}${rnd(LETTERS)}C${rnd(LETTERS)}${String(crypto.randomInt(1000, 9999))}${rnd(LETTERS)}`;
    const first14 = `${state}${pan}${entity}Z`;
    const check = gstinChecksumChar(first14);
    if (!last || check === last) return first14 + check;
  }
  throw new Error("Could not make a sample GSTIN");
}

type Scenario = { name: string; state: string; entity: string; last?: string; items: CwCode[]; daysAgo: number; pending?: boolean; failed?: CwCode };

// Every check, so the sample reports show every section and chart (v4 FR-MK-02).
const FULL: CwCode[] = [
  "CW_GST_SEARCH", "CW_GST_TURNOVER_4Y", "CW_CIBIL_COMPANY", "CW_COMPANY", "CW_DIRECTORS", "CW_MSME", "CW_PAN", "CW_IEC_PROFILE",
  "CW_IEC_TURNOVER", "CW_CREDIT_RATING",
];
const PUBLIC: CwCode[] = ["CW_GST_SEARCH", "CW_COMPANY", "CW_DIRECTORS", "CW_MSME"];

// Dummy rules: 13th character 9 = GST cancelled, 5 = late GST returns; last character Y = 95 days overdue (CIBIL),
// X = 45 days overdue, Z = falling turnover.
const SCENARIOS: Scenario[] = [
  { name: "Om Builders", state: "29", entity: "1", items: FULL, daysAgo: 1 },
  { name: "Coastal Packaging", state: "27", entity: "1", items: FULL, daysAgo: 3 },
  { name: "Sahyadri Agro Industries", state: "27", entity: "2", items: FULL, daysAgo: 6 },
  { name: "Vasudha Textiles", state: "24", entity: "1", last: "X", items: FULL, daysAgo: 9 },
  { name: "Ganga Polymers", state: "09", entity: "1", last: "Z", items: FULL, daysAgo: 14 },
  { name: "Deccan Fasteners", state: "36", entity: "5", items: FULL, daysAgo: 20 },
  { name: "Neelkanth Traders", state: "08", entity: "1", last: "Y", items: FULL, daysAgo: 27 },
  { name: "Arihant Metals", state: "29", entity: "9", items: PUBLIC, daysAgo: 35 },
  { name: "Lotus Electricals", state: "33", entity: "1", items: PUBLIC, daysAgo: 48 },
  { name: "Shivam Logistics", state: "07", entity: "1", items: FULL, daysAgo: 62, failed: "CW_DIRECTORS" },
  { name: "Mahalaxmi Foods", state: "27", entity: "3", items: FULL, daysAgo: 0, pending: true },
  { name: "Kaveri Pipes", state: "29", entity: "1", items: PUBLIC, daysAgo: 80 },
];

export async function createSampleReports(ctx: Ctx) {
  const db = sql();
  const created: string[] = [];
  const access = { gstToken: "sample", companyPan: "sample", incorporatedOn: "2015-04-12", personalPan: null, birthDate: null };
  for (const s of SCENARIOS) {
    const gstin = sampleGstin(s.state, s.entity, s.last);
    // Always the sample GST source: these GSTINs are made up, so a live source would not know them.
    const r0 = await mockIdentityProvider.searchGstin(gstin);
    if (r0.status !== "success" || !r0.data) continue; // the dummy says "not found" for some 13th characters
    const gst = { gstStatus: r0.data.status, address: r0.data.address };
    // Saved directly (not through createCounterparty) so sample companies are not charged.
    const mobile = `9${String(crypto.randomInt(100_000_000, 999_999_999))}`;
    const legalName = `${s.name.toUpperCase()} PRIVATE LIMITED`;
    const pan = panFromGstin(gstin);
    const [{ id: counterpartyId }] = await db<{ id: string }[]>`
      insert into public.counterparties (org_id, type, legal_name, trade_name, gstin, gst_status, pan_hash, pan_ciphertext, pan_masked,
        contact_name, mobile_hash, mobile_ciphertext, mobile_masked, address, state_code, city, tags, created_by)
      values (${ctx.orgId}, 'business_gstin', ${legalName}, ${s.name}, ${gstin}, ${gst.gstStatus}, ${blindIndex(pan, "pan")},
        ${encryptField(pan, "counterparties.pan")}, ${maskPan(pan)}, 'Accounts Desk', ${blindIndex(mobile, "mobile")},
        ${encryptField(mobile, "counterparties.mobile")}, ${maskMobile(mobile)}, ${db.json(gst.address)}, ${s.state}, ${gst.address.city},
        ${[SAMPLE_TAG]}, ${ctx.user.id})
      returning id`;
    const input = { legalName };

    const at = new Date(Date.now() - s.daysAgo * 86_400_000 - crypto.randomInt(0, 8 * 3600_000));
    const [{ report_no }] = await db<{ report_no: string }[]>`select app_private.next_report_no() as report_no`;
    const [req] = await db<{ id: string }[]>`
      insert into public.check_requests (org_id, counterparty_id, report_no, run_mode, created_by, tab, created_at, valid_until)
      values (${ctx.orgId}, ${counterpartyId}, ${report_no}, 'together', ${ctx.user.id}, 'credit_worthiness', ${at}, ${new Date(at.getTime() + 30 * 86_400_000)})
      returning id`;
    const subject = { type: "business_gstin" as const, gstin, pan: panFromGstin(gstin), cin: null, udyam: null, iec: null, legalName: input.legalName, stateCode: s.state };
    const today = istDate(at);
    for (const code of s.items) {
      const consent = code === "CW_GST_TURNOVER_4Y" || code === "CW_CIBIL_COMPANY";
      if (s.pending && consent) {
        await db`insert into public.check_items (org_id, request_id, counterparty_id, item_code, needs_consent, status, created_at)
                 values (${ctx.orgId}, ${req.id}, ${counterpartyId}, ${code}, true, 'waiting_consent', ${at})`;
        continue;
      }
      if (s.failed === code) {
        await db`insert into public.check_items (org_id, request_id, counterparty_id, item_code, needs_consent, status, provider, error_code, error_message, created_at)
                 values (${ctx.orgId}, ${req.id}, ${counterpartyId}, ${code}, false, 'not_available', 'mock_checks', 'SOURCE_DOWN', 'Not available from source. Not charged.', ${at})`;
        continue;
      }
      const r = await mockCheckProvider.run(code, subject, { today, consent: access });
      const status = r.status === "success" ? "success" : r.status === "no_data" ? "no_data" : "not_available";
      await db`
        insert into public.check_items (org_id, request_id, counterparty_id, item_code, needs_consent, status, provider, data, error_code,
                                        error_message, fetched_at, source_time, created_at)
        values (${ctx.orgId}, ${req.id}, ${counterpartyId}, ${code}, ${consent}, ${status}::public.check_item_status, 'mock_checks',
                ${r.data === undefined || r.data === null ? null : db.json(r.data as JSONValue)}, ${r.error?.code ?? null}, ${r.error?.message ?? null},
                ${at}, ${at}, ${at})`;
    }
    await refreshReport(req.id);
    if (!s.pending) await db`update public.check_requests set completed_at = ${new Date(at.getTime() + 90_000)} where id = ${req.id}`;
    created.push(report_no);
  }
  return { created: created.length, reports: created, validFrom: addDays(istDate(new Date()), -90) };
}

/** Removes the sample companies and everything made for them (reports cascade). */
export async function removeSampleReports(ctx: Ctx) {
  const rows = await sql()`
    delete from public.counterparties where org_id = ${ctx.orgId} and ${SAMPLE_TAG} = any(tags) returning id`;
  return { removed: rows.length };
}
