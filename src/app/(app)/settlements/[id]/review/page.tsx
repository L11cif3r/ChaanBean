import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SettlementReview } from "@/components/settlements/settlement-review";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { getSettlement, settlementQuote } from "@/server/settlements/service";

// S17 marker 5: review and send, the same flow as S14.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S14.title") };
}

export default function Page({ params }: PageProps<"/settlements/[id]/review">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Review params={params} />
    </Suspense>
  );
}

async function Review({ params }: { params: PageProps<"/settlements/[id]/review">["params"] }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const c = { ...ctx, user: ctx.user, orgId: ctx.orgId };
  const st = await getSettlement(c, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  if (!can(ctx.role, "settlement.manage") || st.status !== "draft") redirect(`/settlements/${id}`);
  return <SettlementReview st={st} quote={await settlementQuote(c, id)} />;
}
