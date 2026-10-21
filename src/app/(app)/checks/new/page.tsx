import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ChooseChecks } from "@/components/checks/choose-checks";
import { CwTabs } from "@/components/checks/cw-tabs";
import type { CompanyOption } from "@/components/checks/company-search";
import type { RecentReport } from "@/components/checks/cw-start";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { sql } from "@/server/db/sql";

// S08 (PRD v2.0 Figure 4): Credit Worthiness, choose the checks for a buyer and see the cost.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S08.title") };
}

export default function Page({ searchParams }: PageProps<"/checks/new">) {
  return (
    <div className="space-y-5">
      <CwTabs active="new" />
      <Suspense fallback={<PageSkeleton />}>
        <Choose searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Choose({ searchParams }: { searchParams: PageProps<"/checks/new">["searchParams"] }) {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null; // OrgGate in the layout redirects
  if (!can(ctx.role, "check.run")) {
    const t = await getTranslations("counterparties");
    return (
      <Card>
        <EmptyState title={t("noAccess")} />
      </Card>
    );
  }
  const params = await searchParams;
  const wanted = typeof params.counterparty === "string" ? params.counterparty : null;
  const rows = await sql()<{ id: string; name: string; trade_name: string | null; gstin: string | null; pan_masked: string | null; city: string | null }[]>`
    select id, legal_name as name, trade_name, gstin, pan_masked, address->>'city' as city from public.counterparties
     where org_id = ${ctx.orgId} and status = 'active' order by updated_at desc limit 2000`;
  const buyers: CompanyOption[] = rows.map((r) => ({ id: r.id, name: r.name, tradeName: r.trade_name, gstin: r.gstin, panMasked: r.pan_masked, city: r.city }));
  const initial = wanted && buyers.some((b) => b.id === wanted) ? wanted : null;
  const recent = await sql()<{ id: string; counterparty_id: string; legal_name: string; trade_name: string | null; risk_level: RecentReport["risk"]; created_at: Date }[]>`
    select r.id, r.counterparty_id, c.legal_name, c.trade_name, r.risk_level::text as risk_level, r.created_at
      from public.check_requests r join public.counterparties c on c.id = r.counterparty_id
     where r.org_id = ${ctx.orgId} and r.tab = 'credit_worthiness' and c.status = 'active'
     order by r.created_at desc limit 12`;
  return (
    <ChooseChecks
      buyers={buyers}
      initialBuyer={initial}
      recent={recent.map((r) => ({ id: r.id, companyId: r.counterparty_id, name: r.legal_name, shortName: r.trade_name, risk: r.risk_level, createdAt: r.created_at.toISOString() }))}
    />
  );
}
