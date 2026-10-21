import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SettlementList } from "@/components/settlements/settlement-list";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { listSettlements } from "@/server/settlements/service";

// E-Settlement list (STL; PRD v3.0 8.7): every settlement with what is to be paid, the next instalment and status.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("STL.title") };
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
  const rows = await listSettlements({ ...ctx, user: ctx.user, orgId: ctx.orgId });
  return <SettlementList rows={rows} canCreate={can(ctx.role, "settlement.manage")} />;
}
