import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { getTransaction } from "@/server/transactions/service";

// S16 (PRD v3.0 Figure 23): agreement detail and evidence.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S16.title") };
}

export default function Page({ params }: PageProps<"/transactions/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/transactions/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const tx = await getTransaction({ ...ctx, user: ctx.user, orgId: ctx.orgId }, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  return <TransactionDetail tx={tx} canManage={can(ctx.role, "transaction.manage")} canPay={can(ctx.role, "payment.record")} canExport={can(ctx.role, "report.export")} />;
}
