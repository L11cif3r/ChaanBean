import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BulkSearch } from "@/components/checks/bulk-search";
import { CwTabs } from "@/components/checks/cw-tabs";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { listBulk } from "@/server/bulk/service";
import { bulkMaxRows, bulkMaxTyped } from "@/server/bulk/rows";
import { getContext } from "@/server/context";

// v4 section 6: multiple search, typed or from an Excel/CSV file.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checks.multi");
  return { title: t("title") };
}

export default function Page() {
  return (
    <div className="space-y-5">
      <CwTabs active="bulk" />
      <Suspense fallback={<PageSkeleton />}>
        <Bulk />
      </Suspense>
    </div>
  );
}

async function Bulk() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  if (!can(ctx.role, "check.run")) {
    const t = await getTranslations("counterparties");
    return <Card><EmptyState title={t("noAccess")} /></Card>;
  }
  const previous = await listBulk({ ...ctx, user: ctx.user, orgId: ctx.orgId });
  return <BulkSearch maxTyped={bulkMaxTyped()} maxRows={bulkMaxRows()} previous={previous} />;
}
