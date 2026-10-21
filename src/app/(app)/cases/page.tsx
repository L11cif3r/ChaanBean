import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CaseCheck } from "@/components/cases/case-check";
import type { CompanyOption } from "@/components/checks/company-search";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { sql } from "@/server/db/sql";

// S12 (PRD v3.0 section 7, Figure 17): Case Check. Pick the buyer and the checks, see the cost, search.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S12.title") };
}

export default function Page({ searchParams }: PageProps<"/cases">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Cases searchParams={searchParams} />
    </Suspense>
  );
}

async function Cases({ searchParams }: { searchParams: PageProps<"/cases">["searchParams"] }) {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null; // OrgGate in the layout redirects
  if (!can(ctx.role, "case.run")) {
    const t = await getTranslations("counterparties");
    return (
      <Card>
        <EmptyState title={t("noAccess")} />
      </Card>
    );
  }
  const params = await searchParams;
  const wanted = typeof params.counterparty === "string" ? params.counterparty : null;
  const buyers = await sql()<CompanyOption[]>`
    select id, legal_name as name, trade_name as "tradeName", gstin, pan_masked as "panMasked", city from public.counterparties
     where org_id = ${ctx.orgId} and status = 'active' order by lower(legal_name) limit 500`;
  const initial = wanted && buyers.some((b) => b.id === wanted) ? wanted : null;
  return <CaseCheck buyers={buyers} initialBuyer={initial} />;
}
