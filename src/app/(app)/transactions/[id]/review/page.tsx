import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ReviewSend } from "@/components/transactions/review-send";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { getTransaction, sendQuote } from "@/server/transactions/service";

// S14 (PRD v3.0 Figure 20): review and send.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S14.title") };
}

export default function Page({ params }: PageProps<"/transactions/[id]/review">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Review params={params} />
    </Suspense>
  );
}

async function Review({ params }: { params: PageProps<"/transactions/[id]/review">["params"] }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const c = { ...ctx, user: ctx.user, orgId: ctx.orgId };
  const tx = await getTransaction(c, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  if (!can(ctx.role, "transaction.manage") || tx.status !== "draft") redirect(`/transactions/${id}`);
  return <ReviewSend tx={tx} quote={await sendQuote(c, id)} />;
}
