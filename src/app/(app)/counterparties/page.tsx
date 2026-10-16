import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CounterpartyList } from "@/components/counterparties/counterparty-list";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { listCounterparties } from "@/server/counterparties/service";

// S05: every buyer, debtor and borrower of the organisation.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S05.title") };
}

// The page reads the session, so it streams behind its own boundary.
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <List />
    </Suspense>
  );
}

async function List() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null; // OrgGate in the layout redirects
  const initial = await listCounterparties({ ...ctx, user: ctx.user, orgId: ctx.orgId }, {});
  return <CounterpartyList initial={initial} canManage={can(ctx.role, "counterparty.manage")} canExport={can(ctx.role, "org.edit")} />;
}
