import "server-only";
import { sql } from "@/server/db/sql";
import type { RequestContext } from "@/server/context";

// Credit Worthiness history: every report of the organisation with what the filters need (company, GSTIN, risk,
// safe range, status, date, single or bulk). Filtering happens on the page, so it is instant.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

export interface HistoryRow {
  id: string;
  reportNo: string;
  company: { id: string; name: string; gstin: string | null; city: string | null };
  riskLevel: "low" | "medium" | "high" | "not_enough_data" | null;
  creditLowPaise: number | null;
  creditHighPaise: number | null;
  status: "in_progress" | "complete" | "partial";
  waitingConsent: boolean;
  createdAt: string;
  expired: boolean;
  checks: number;
  /** The multiple search this report came from (v4 section 7). */
  bulk: { id: string; fileName: string | null } | null;
  by: string | null;
}

export async function reportHistory(ctx: Ctx): Promise<{ rows: HistoryRow[]; now: number }> {
  const rows = await sql()<{ id: string; report_no: string; cp_id: string; legal_name: string; gstin: string | null; city: string | null; risk_level: HistoryRow["riskLevel"]; credit_low_paise: string | null; credit_high_paise: string | null; status: HistoryRow["status"]; waiting: boolean; created_at: Date; valid_until: Date; checks: number; bulk_id: string | null; file_name: string | null; by: string | null }[]>`
    select r.id, r.report_no, c.id as cp_id, c.legal_name, c.gstin, c.city, r.risk_level::text as risk_level, r.credit_low_paise, r.credit_high_paise,
           r.status::text as status, r.created_at, r.valid_until, b.id as bulk_id, b.file_name, u.full_name as by,
           exists (select 1 from public.check_items i where i.request_id = r.id and i.status = 'waiting_consent') as waiting,
           (select count(*)::int from public.check_items i where i.request_id = r.id) as checks
      from public.check_requests r
      join public.counterparties c on c.id = r.counterparty_id
      left join public.bulk_searches b on b.id = r.bulk_id
      left join public.user_profiles u on u.id = r.created_by
     where r.org_id = ${ctx.orgId} and r.tab = 'credit_worthiness'
     order by r.created_at desc limit 1000`;
  const now = Date.now();
  const list = rows.map((r) => ({
    id: r.id, reportNo: r.report_no, company: { id: r.cp_id, name: r.legal_name, gstin: r.gstin, city: r.city },
    riskLevel: r.risk_level, creditLowPaise: r.credit_low_paise === null ? null : Number(r.credit_low_paise),
    creditHighPaise: r.credit_high_paise === null ? null : Number(r.credit_high_paise), status: r.status, waitingConsent: r.waiting,
    createdAt: r.created_at.toISOString(), expired: r.valid_until.getTime() < now, checks: r.checks,
    bulk: r.bulk_id ? { id: r.bulk_id, fileName: r.file_name } : null, by: r.by,
  }));
  return { rows: list, now };
}
