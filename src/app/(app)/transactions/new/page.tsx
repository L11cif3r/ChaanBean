import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AgreementForm } from "@/components/transactions/agreement-form";
import { blankDraft } from "@/lib/agreement-draft";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { formData } from "@/server/transactions/pages";

// S13 (PRD v3.0 Figure 19): a new seller, buyer or lender agreement.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S13.title") };
}

export default function Page({ searchParams }: PageProps<"/transactions/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <New searchParams={searchParams} />
    </Suspense>
  );
}

async function New({ searchParams }: { searchParams: PageProps<"/transactions/new">["searchParams"] }) {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null; // OrgGate in the layout redirects
  if (!can(ctx.role, "transaction.manage")) {
    const t = await getTranslations("counterparties");
    return <Card><EmptyState title={t("noAccess")} /></Card>;
  }
  const params = await searchParams;
  const { buyers, jurisdiction } = await formData(ctx.orgId);
  const wanted = typeof params.counterparty === "string" && buyers.some((b) => b.id === params.counterparty) ? params.counterparty : "";
  return <AgreementForm buyers={buyers} initial={blankDraft(wanted, buyers)} jurisdiction={jurisdiction} />;
}
