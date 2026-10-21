import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SettlementDetail } from "@/components/settlements/settlement-detail";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { getSettlement } from "@/server/settlements/service";

// Settlement detail: same layout as S16 (PRD v1.0 S17 exit point).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("STL.title") };
}

export default function Page({ params }: PageProps<"/settlements/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/settlements/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const st = await getSettlement({ ...ctx, user: ctx.user, orgId: ctx.orgId }, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  return <SettlementDetail st={st} canManage={can(ctx.role, "settlement.manage")} canPay={can(ctx.role, "payment.record")} canExport={can(ctx.role, "report.export")} />;
}
