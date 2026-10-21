import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SettlementForm } from "@/components/settlements/settlement-form";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { settlementDraftFrom } from "@/server/settlements/pages";
import { getSettlement, owedOption, settlementFormData } from "@/server/settlements/service";

// S17 again for a draft, or to revise after a counter-proposal (?proposal= fills in the debtor's terms).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S17.title") };
}

export default function Page({ params, searchParams }: PageProps<"/settlements/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Edit params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Edit({ params, searchParams }: { params: PageProps<"/settlements/[id]/edit">["params"]; searchParams: PageProps<"/settlements/[id]/edit">["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const c = { ...ctx, user: ctx.user, orgId: ctx.orgId };
  const view = await getSettlement(c, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  if (!can(ctx.role, "settlement.manage") || (view.status !== "draft" && view.status !== "counter_proposed")) redirect(`/settlements/${id}`);
  const [data, owedNow] = await Promise.all([settlementFormData(c), view.original ? owedOption(c, view.original.id, view.id) : Promise.resolve(null)]);
  const useProposal = typeof sp.proposal === "string" && sp.proposal === view.proposal?.id;
  return <SettlementForm initial={settlementDraftFrom(view, useProposal)} overdue={data.overdue} debtors={data.debtors} jurisdiction={data.jurisdiction} owedNow={owedNow} />;
}
