import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CounterpartyForm } from "@/components/counterparties/counterparty-form";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";

// S06: register a buyer, debtor or borrower (Owner, Admin and Member).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S06.title") };
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <New />
    </Suspense>
  );
}

async function New() {
  const ctx = await getContext();
  if (!can(ctx.role, "counterparty.manage")) {
    const t = await getTranslations("counterparties");
    return (
      <Card>
        <EmptyState title={t("noAccess")} />
      </Card>
    );
  }
  return <CounterpartyForm />;
}
