import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AgreementForm } from "@/components/transactions/agreement-form";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { draftFrom, formData } from "@/server/transactions/pages";
import { getTransaction } from "@/server/transactions/service";

// S13 again for a draft, or after the counterparty asked for changes (the next send is a new version).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S13.title") };
}

export default function Page({ params }: PageProps<"/transactions/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: { params: PageProps<"/transactions/[id]/edit">["params"] }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const c = { ...ctx, user: ctx.user, orgId: ctx.orgId };
  const view = await getTransaction(c, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  if (!can(ctx.role, "transaction.manage") || (view.status !== "draft" && view.status !== "changes_requested")) redirect(`/transactions/${id}`);
  const { buyers, jurisdiction } = await formData(ctx.orgId);
  return <AgreementForm buyers={buyers} initial={draftFrom(view)} jurisdiction={jurisdiction} />;
}
