import "server-only";
import type { JSONValue } from "postgres";
import { SOURCE_OF, scoreMatch, type CaseCandidate, type CaseInput, type CcCode, type Confidence } from "@/lib/cases";
import { audit } from "@/server/audit";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import type { RequestContext } from "@/server/context";

// Case Check results (PRD v3.0 section 7; v1.0 S12, FR-CC-02–08). The engine (src/server/checks/service.ts) runs the
// search and charges for it; this file keeps each possible match with Chaanbean's confidence, takes the user's
// review, and tells the credit report which matches were confirmed. Only Confirmed matches count (FR-CC-04).

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };
export type Review = "pending" | "confirmed" | "not_this_person" | "unsure";

const ORDER: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };

/** Saves the matches of one finished item and returns the counts kept on the item (S12 marker 3). */
export async function storeMatches(
  item: { id: string; org_id: string; request_id: string; counterparty_id: string; item_code: string },
  input: CaseInput,
  candidates: CaseCandidate[],
) {
  const source = SOURCE_OF[item.item_code as CcCode];
  const rows = candidates.map((c) => {
    const { score, confidence } = scoreMatch(input, c);
    return {
      org_id: item.org_id, counterparty_id: item.counterparty_id, request_id: item.request_id, check_item_id: item.id, source,
      source_id: c.sourceId, case_no: c.caseNo, court: c.court, case_type: c.caseType, filed_on: c.filedOn, case_status: c.status,
      pending: c.pending, next_hearing: c.nextHearing, parties: sql().json(c.parties as unknown as JSONValue), acts: c.acts,
      recovery: c.recovery, list_name: c.listName ?? null, list_date: c.listDate ?? null, score, confidence,
      details: sql().json(c.details as JSONValue),
    };
  });
  if (rows.length) {
    await sql()`insert into public.case_matches ${sql()(rows)} on conflict (check_item_id, source_id) do nothing`;
  }
  return {
    matches: rows.length,
    pending: rows.filter((r) => r.pending).length,
    disposed: rows.filter((r) => !r.pending).length,
    high: rows.filter((r) => r.confidence === "high").length,
  };
}

/** For the credit report: confirmed pending cheque bounce or recovery cases, and a confirmed watchlist hit. */
export async function confirmedCases(counterpartyId: string) {
  const [r] = await sql()<{ recovery: number; aml: number }[]>`
    select count(*) filter (where source <> 'aml' and recovery and pending)::int as recovery,
           count(*) filter (where source = 'aml')::int as aml
      from public.case_matches where counterparty_id = ${counterpartyId} and review = 'confirmed'`;
  return { pendingChequeBounce: r?.recovery ?? 0, amlHit: (r?.aml ?? 0) > 0 };
}

export interface CaseMatchView {
  id: string;
  source: "court" | "fir" | "aml";
  caseNo: string | null;
  court: string;
  caseType: string;
  filedOn: string | null;
  status: string;
  pending: boolean;
  nextHearing: string | null;
  parties: { role: string; name: string }[];
  acts: string[];
  recovery: boolean;
  listName: string | null;
  listDate: string | null;
  score: number;
  confidence: Confidence;
  details: Record<string, unknown>;
  review: Review;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

interface MatchRow {
  id: string; source: CaseMatchView["source"]; case_no: string | null; court: string; case_type: string; filed_on: string | null;
  case_status: string; pending: boolean; next_hearing: string | null; parties: CaseMatchView["parties"]; acts: string[];
  recovery: boolean; list_name: string | null; list_date: string | null; score: number; confidence: Confidence;
  details: Record<string, unknown>; review: Review; reviewer: string | null; reviewed_at: Date | null;
}

const toView = (m: MatchRow): CaseMatchView => ({
  id: m.id, source: m.source, caseNo: m.case_no, court: m.court, caseType: m.case_type, filedOn: m.filed_on, status: m.case_status,
  pending: m.pending, nextHearing: m.next_hearing, parties: m.parties, acts: m.acts, recovery: m.recovery, listName: m.list_name,
  listDate: m.list_date, score: m.score, confidence: m.confidence, details: m.details, review: m.review, reviewedBy: m.reviewer,
  reviewedAt: m.reviewed_at?.toISOString() ?? null,
});

const matchQuery = (orgId: string, by: { requestId: string } | { counterpartyId: string; confirmed: true }) => sql()<MatchRow[]>`
  select m.id, m.source, m.case_no, m.court, m.case_type, to_char(m.filed_on, 'YYYY-MM-DD') as filed_on, m.case_status, m.pending,
         to_char(m.next_hearing, 'YYYY-MM-DD') as next_hearing, m.parties, m.acts, m.recovery, m.list_name,
         to_char(m.list_date, 'YYYY-MM-DD') as list_date, m.score, m.confidence, m.details, m.review,
         p.full_name as reviewer, m.reviewed_at
    from public.case_matches m left join public.user_profiles p on p.id = m.reviewed_by
   where m.org_id = ${orgId}
     and ${"requestId" in by ? sql()`m.request_id = ${by.requestId}` : sql()`m.counterparty_id = ${by.counterpartyId} and m.review = 'confirmed'`}`;

export interface CaseCheckView {
  id: string;
  reportNo: string;
  counterparty: { id: string; name: string };
  runMode: "together" | "manual";
  status: "in_progress" | "complete" | "partial";
  createdAt: string;
  search: { name: string; state: string; district: string };
  items: { code: CcCode; name: string; status: string; errorCode: string | null; error: string | null; fetchedAt: string | null; provider: string | null; charged: boolean }[];
  matches: CaseMatchView[];
  counts: { matches: number; pending: number; disposed: number; notReviewed: number; confirmed: number };
  testData: boolean;
}

/** S12 results for one Case Check: counters, the ranked matches and each check's state. */
export async function getCaseCheck(ctx: Ctx, id: string): Promise<CaseCheckView> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("This Case Check");
  const db = sql();
  const [r] = await db<{ id: string; report_no: string; run_mode: CaseCheckView["runMode"]; status: CaseCheckView["status"]; created_at: Date; inputs_summary: CaseCheckView["search"]; counterparty_id: string; legal_name: string }[]>`
    select r.id, r.report_no, r.run_mode, r.status, r.created_at, r.inputs_summary, c.id as counterparty_id, c.legal_name
      from public.check_requests r join public.counterparties c on c.id = r.counterparty_id
     where r.id = ${id} and r.org_id = ${ctx.orgId} and r.tab = 'case_check'`;
  if (!r) throw notFound("This Case Check");
  const [items, matches] = await Promise.all([
    db<{ item_code: CcCode; name: string; status: string; error_code: string | null; error_message: string | null; fetched_at: Date | null; provider: string | null; charged: boolean }[]>`
      select i.item_code, b.name, i.status::text as status, i.error_code, i.error_message, i.fetched_at, i.provider, i.charged
        from public.check_items i join public.billing_items b on b.code = i.item_code
       where i.request_id = ${id} order by b.sort`,
    matchQuery(ctx.orgId, { requestId: id }),
  ]);
  const views = matches.map(toView).sort((a, b) => ORDER[a.confidence] - ORDER[b.confidence] || b.score - a.score);
  return {
    id: r.id,
    reportNo: r.report_no,
    counterparty: { id: r.counterparty_id, name: r.legal_name },
    runMode: r.run_mode,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    search: r.inputs_summary,
    items: items.map((i) => ({
      code: i.item_code, name: i.name, status: i.status, errorCode: i.error_code, error: i.error_message,
      fetchedAt: i.fetched_at?.toISOString() ?? null, provider: i.provider, charged: i.charged,
    })),
    matches: views,
    counts: {
      matches: views.length,
      pending: views.filter((m) => m.pending).length,
      disposed: views.filter((m) => !m.pending).length,
      notReviewed: views.filter((m) => m.review === "pending").length,
      confirmed: views.filter((m) => m.review === "confirmed").length,
    },
    testData: items.some((i) => i.provider?.startsWith("mock")),
  };
}

/** Counterparty profile Cases tab: every Case Check run and the matches confirmed so far. */
export async function caseChecksFor(ctx: Ctx, counterpartyId: string) {
  const db = sql();
  const [runs, confirmed] = await Promise.all([
    db<{ id: string; report_no: string; status: string; created_at: Date; items: string[]; matches: number; not_reviewed: number }[]>`
      select r.id, r.report_no, r.status::text as status, r.created_at,
             array(select item_code from public.check_items i where i.request_id = r.id order by item_code) as items,
             (select count(*)::int from public.case_matches m where m.request_id = r.id) as matches,
             (select count(*)::int from public.case_matches m where m.request_id = r.id and m.review = 'pending') as not_reviewed
        from public.check_requests r
       where r.org_id = ${ctx.orgId} and r.counterparty_id = ${counterpartyId} and r.tab = 'case_check'
       order by r.created_at desc limit 50`,
    matchQuery(ctx.orgId, { counterpartyId, confirmed: true }),
  ]);
  return {
    runs: runs.map((r) => ({ id: r.id, reportNo: r.report_no, status: r.status, createdAt: r.created_at.toISOString(), items: r.items, matches: r.matches, notReviewed: r.not_reviewed })),
    confirmed: confirmed.map(toView),
  };
}

/** S12 marker 5 (FR-CC-04): Confirm, Not this person or Unsure, with who and when. Changes the risk level at once. */
export async function reviewMatch(ctx: Ctx, matchId: string, review: Exclude<Review, "pending">) {
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) throw notFound("This match");
  const db = sql();
  const [before] = await db<{ review: Review; counterparty_id: string }[]>`
    select review, counterparty_id from public.case_matches where id = ${matchId} and org_id = ${ctx.orgId}`;
  if (!before) throw notFound("This match");
  if (before.review === review) return { review };
  const [after] = await db<{ review: Review }[]>`
    update public.case_matches set review = ${review}::public.case_review, reviewed_by = ${ctx.user.id}, reviewed_at = now()
     where id = ${matchId} and org_id = ${ctx.orgId} returning review`;
  if (!after) throw new AppError("conflict", "This match could not be updated.");
  await audit(ctx, { action: "case_match.reviewed", entity: "case_match", entityId: matchId, before: { review: before.review }, after: { review } });
  // Reports still in their 30 days pick up the change (v3 FR-CW-11: recalculated when any section changes).
  const reports = await db<{ id: string }[]>`
    select id from public.check_requests
     where counterparty_id = ${before.counterparty_id} and tab = 'credit_worthiness' and valid_until > now()`;
  const { refreshReport } = await import("@/server/checks/service");
  for (const rep of reports) await refreshReport(rep.id);
  return { review };
}
