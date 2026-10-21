import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CwTabs } from "@/components/checks/cw-tabs";
import { HistoryList } from "@/components/checks/history-list";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { reportHistory } from "@/server/checks/history";
import { getContext } from "@/server/context";

// Every Credit Worthiness search, with filters by company, risk level, status, date and single or bulk.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checks.history");
  return { title: t("title") };
}

export default function Page() {
  return (
    <div className="space-y-5">
      <CwTabs active="history" />
      <Suspense fallback={<PageSkeleton />}>
        <History />
      </Suspense>
    </div>
  );
}

async function History() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const { rows, now } = await reportHistory({ ...ctx, user: ctx.user, orgId: ctx.orgId });
  return <HistoryList rows={rows} now={now} devSample={process.env.NODE_ENV !== "production" && can(ctx.role, "check.run")} />;
}
