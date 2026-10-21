import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SettlementForm } from "@/components/settlements/settlement-form";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { blankSettlement } from "@/lib/settlement-draft";
import { getContext } from "@/server/context";
import { settlementFormData } from "@/server/settlements/service";

// S17 (PRD v1.0 Wireframe S17; v3.0 8.7): a new E-Settlement, from an overdue agreement (?transaction=) or for an
// outside debt (?counterparty=).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S17.title") };
}

export default function Page({ searchParams }: PageProps<"/settlements/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <New searchParams={searchParams} />
    </Suspense>
  );
}

async function New({ searchParams }: { searchParams: PageProps<"/settlements/new">["searchParams"] }) {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  if (!can(ctx.role, "settlement.manage")) {
    const t = await getTranslations("counterparties");
    return <Card><EmptyState title={t("noAccess")} /></Card>;
  }
  const params = await searchParams;
  const data = await settlementFormData({ ...ctx, user: ctx.user, orgId: ctx.orgId });
  const tx = typeof params.transaction === "string" && data.overdue.some((o) => o.id === params.transaction) ? params.transaction : "";
  const cp = typeof params.counterparty === "string" && data.debtors.some((d) => d.id === params.counterparty) ? params.counterparty : "";
  return <SettlementForm initial={blankSettlement(tx, tx ? "" : cp)} overdue={data.overdue} debtors={data.debtors} jurisdiction={data.jurisdiction} />;
}
