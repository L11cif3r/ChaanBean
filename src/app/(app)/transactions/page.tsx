import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { TransactionList } from "@/components/transactions/transaction-list";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { listTransactions } from "@/server/transactions/service";

// Business Security (PRD v3.0 section 8): every agreement with its status, balance and due date. Optional tab.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("TXL.title") };
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <List />
    </Suspense>
  );
}

async function List() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const rows = await listTransactions({ ...ctx, user: ctx.user, orgId: ctx.orgId });
  return <TransactionList rows={rows} canCreate={can(ctx.role, "transaction.manage")} />;
}
