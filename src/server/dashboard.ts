import "server-only";
import { sql } from "@/server/db/sql";

// Dashboard summary (S04): a few counts for the signed-in organisation, read in one query. The caller has already
// checked the session and membership (loadAccount), so the query is scoped by org id.

export interface DashboardSummary {
  counterparties: number;
  checksThisMonth: number;
  highRisk: number;
  caseChecks: number;
  openTransactions: number;
  outstandingPaise: number;
  overdue: number;
  recent: { id: string; reportNo: string; company: string; riskLevel: "low" | "medium" | "high" | "not_enough_data" | null; createdAt: string; tab: string }[];
}

export async function dashboardSummary(orgId: string): Promise<DashboardSummary> {
  const db = sql();
  const [[c], recent] = await Promise.all([
    db<{ cps: number; checks: number; high: number; cases: number; open: number; outstanding: string | null; overdue: number }[]>`
      select
        (select count(*)::int from public.counterparties where org_id = ${orgId} and archived_at is null) as cps,
        (select count(*)::int from public.check_requests where org_id = ${orgId} and tab = 'credit_worthiness'
           and created_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as checks,
        (select count(*)::int from public.check_requests where org_id = ${orgId} and risk_level = 'high' and valid_until > now()) as high,
        (select count(*)::int from public.check_requests where org_id = ${orgId} and tab <> 'credit_worthiness') as cases,
        (select count(*)::int from public.transactions where org_id = ${orgId}
           and status in ('sent', 'viewed', 'changes_requested', 'accepted', 'active', 'partially_paid', 'overdue')) as open,
        (select sum(total_paise - paid_now_paise)::text from public.transactions where org_id = ${orgId}
           and status in ('accepted', 'active', 'partially_paid', 'overdue')) as outstanding,
        (select count(*)::int from public.transactions where org_id = ${orgId} and status = 'overdue') as overdue`,
    db<{ id: string; report_no: string; legal_name: string; risk_level: DashboardSummary["recent"][number]["riskLevel"]; created_at: Date; tab: string }[]>`
      select r.id, r.report_no, c.legal_name, r.risk_level::text as risk_level, r.created_at, r.tab::text as tab
        from public.check_requests r join public.counterparties c on c.id = r.counterparty_id
       where r.org_id = ${orgId}
       order by r.created_at desc limit 5`,
  ]);
  return {
    counterparties: c.cps,
    checksThisMonth: c.checks,
    highRisk: c.high,
    caseChecks: c.cases,
    openTransactions: c.open,
    outstandingPaise: Number(c.outstanding ?? 0),
    overdue: c.overdue,
    recent: recent.map((r) => ({ id: r.id, reportNo: r.report_no, company: r.legal_name, riskLevel: r.risk_level, createdAt: r.created_at.toISOString(), tab: r.tab })),
  };
}
