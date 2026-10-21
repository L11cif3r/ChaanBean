import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CounterpartyForm } from "@/components/counterparties/counterparty-form";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { priceList } from "@/server/billing/service";
import { getContext } from "@/server/context";

// S06: register a buyer, debtor or borrower (Owner, Admin and Member).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S06.title") };
}

export default function Page({ searchParams }: PageProps<"/counterparties/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <New searchParams={searchParams} />
    </Suspense>
  );
}

async function New({ searchParams }: { searchParams: PageProps<"/counterparties/new">["searchParams"] }) {
  const [ctx, sp] = await Promise.all([getContext(), searchParams]);
  if (!can(ctx.role, "counterparty.manage")) {
    const t = await getTranslations("counterparties");
    return (
      <Card>
        <EmptyState title={t("noAccess")} />
      </Card>
    );
  }
  const item = ctx.orgId ? (await priceList(ctx.orgId)).find((u) => u.code === "CP_ADD") : undefined;
  const addCost = item ? { totalPaise: Number(item.pricePaise) + Number(item.gstPaise), pricePaise: Number(item.pricePaise) } : null;
  // From the Credit Worthiness search (S08): prefill what was typed and go on to the checks after saving.
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
  const initial = { gstin: text(sp.gstin, 15)?.toUpperCase(), name: text(sp.name, 120), thenCheck: sp.then === "check" };
  return <CounterpartyForm addCost={addCost} initial={initial} />;
}
