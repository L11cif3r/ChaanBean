import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ChooseChecks } from "@/components/checks/choose-checks";
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
    <Suspense fallback={<PageSkeleton />}>
      <Choose searchParams={searchParams} />
    </Suspense>
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
  const buyers = await sql()<{ id: string; name: string }[]>`
    select id, legal_name as name from public.counterparties
     where org_id = ${ctx.orgId} and status = 'active' order by lower(legal_name) limit 500`;
  const initial = wanted && buyers.some((b) => b.id === wanted) ? wanted : null;
  return <ChooseChecks buyers={buyers} initialBuyer={initial} />;
}
