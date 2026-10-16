import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { BillingManager, type BillingData } from "@/components/billing/billing-manager";
import { PaymentStatus } from "@/components/billing/payment-status";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { can } from "@/lib/permissions";
import { billingSummary, ledger, listInvoices, usageTable } from "@/server/billing/service";
import { getContext } from "@/server/context";

// S19: plan, usage and wallet (Owner and Admin).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S19.title") };
}

// The page reads the session, so it streams behind its own boundary and client navigations into it stay instant.
export default function BillingPage(props: PageProps<"/account/billing">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Billing searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Billing({ searchParams }: { searchParams: PageProps<"/account/billing">["searchParams"] }) {
  const t = await getTranslations();
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId || !can(ctx.role, "billing.manage")) {
    return (
      <Card>
        <EmptyState title={t("billing.page.noAccessTitle")} body={t("billing.page.noAccessBody")} />
      </Card>
    );
  }

  const sp = await searchParams;
  const order = z.uuid().safeParse(sp.order);
  const [summary, usage, entries, invoices] = await Promise.all([
    billingSummary(ctx.orgId),
    usageTable(ctx.orgId),
    ledger(ctx.orgId, { limit: 200 }),
    listInvoices(ctx.orgId),
  ]);

  const data: BillingData = {
    plan: summary.plan
      ? { name: summary.plan.name, status: summary.plan.status, startsAt: summary.plan.startsAt.toISOString(), endsAt: summary.plan.endsAt.toISOString(), autoRenew: summary.plan.autoRenew, seats: summary.plan.seats }
      : null,
    unitsLeft: summary.unitsLeft,
    walletPaise: Number(summary.walletPaise),
    alertPaise: summary.alertPaise === null ? null : Number(summary.alertPaise),
    lowBalance: summary.lowBalance,
    usage: usage.map((u) => ({ code: u.code, name: u.name, included: u.included, used: u.used, remaining: u.remaining, pricePaise: Number(u.pricePaise) })),
    ledger: entries.map((e) => ({
      id: e.id, at: e.at.toISOString(), type: e.type, source: e.source, itemName: e.itemName, units: e.units,
      amountPaise: Number(e.amountPaise), balanceAfterPaise: e.balanceAfterPaise === null ? null : Number(e.balanceAfterPaise),
    })),
    invoices: invoices.map((i) => ({ id: i.id, number: i.number, issuedAt: i.issuedAt.toISOString(), description: i.description, totalPaise: Number(i.totalPaise) })),
  };
  // Remount when the figures change (after a payment or a setting), so local state starts from the new data.
  const key = `${data.walletPaise}:${data.plan?.endsAt}:${data.plan?.autoRenew}:${data.alertPaise}:${data.ledger[0]?.id}:${data.invoices.length}`;

  return (
    <div className="space-y-6">
      <PageHeader title={t("screens.S19.title")} description={t("screens.S19.purpose")} />
      {order.success ? <PaymentStatus orderId={order.data} /> : null}
      <BillingManager key={key} data={data} openTopup={sp.topup === "1" && !order.success} />
    </div>
  );
}
