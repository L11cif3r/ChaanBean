import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BulkView } from "@/components/checks/bulk-view";
import { CwTabs } from "@/components/checks/cw-tabs";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { CW_CHECKS } from "@/lib/checks";
import { priceList } from "@/server/billing/service";
import { DEEP_CODES } from "@/server/bulk/service";
import { getContext } from "@/server/context";

// v4 sections 6 and 7: confirm matches, quick screen, filter, deep check and export.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checks.multi");
  return { title: t("resultsTitle") };
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-5">
      <CwTabs active="bulk" />
      <Suspense fallback={<PageSkeleton />}>
        <View params={params} />
      </Suspense>
    </div>
  );
}

async function View({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, ctx] = await Promise.all([params, getContext()]);
  if (!ctx.user || !ctx.orgId) return null;
  const prices = await priceList(ctx.orgId);
  const checks = DEEP_CODES.flatMap((code) => {
    const p = prices.find((x) => x.code === code);
    const consent = CW_CHECKS.find((c) => c.code === code)?.consent ?? false;
    return p ? [{ code, name: p.name, pricePaise: Number(p.pricePaise), consent, group: code.startsWith("CC_") ? ("cc" as const) : ("cw" as const) }] : [];
  });
  return <BulkView id={id} checks={checks} />;
}
