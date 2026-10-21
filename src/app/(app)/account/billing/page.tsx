import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { BillingManager, type BillingData } from "@/components/billing/billing-manager";
import { PaymentStatus } from "@/components/billing/payment-status";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { Card, EmptyState, GradientText, PageHeader } from "@/components/ui";
import { can } from "@/lib/permissions";
import { billingSummary, ledger, listInvoices, priceList } from "@/server/billing/service";
import { getContext } from "@/server/context";

// S19: plan, usage and wallet (Owner and Admin).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S19.title") };
}

/** Display only: days in the plan period and days gone by now (this request), for the thin bar on the plan card. */
function planPeriodDays(startsAt: Date, endsAt: Date) {
  const DAY = 86_400_000;
  const total = Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / DAY));
  const used = Math.round((Date.now() - startsAt.getTime()) / DAY);
  return { total, used: Math.min(total, Math.max(0, used)) };
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
    priceList(ctx.orgId),
    ledger(ctx.orgId, { limit: 200 }),
    listInvoices(ctx.orgId),
  ]);

  const planDays = summary.plan ? planPeriodDays(summary.plan.startsAt, summary.plan.endsAt) : null;

  const data: BillingData = {
    plan: summary.plan && planDays
      ? {
          name: summary.plan.name, status: summary.plan.status, startsAt: summary.plan.startsAt.toISOString(), endsAt: summary.plan.endsAt.toISOString(), autoRenew: summary.plan.autoRenew, seats: summary.plan.seats,
          daysTotal: planDays.total, daysUsed: planDays.used,
        }
      : null,
    walletPaise: Number(summary.walletPaise),
    alertPaise: summary.alertPaise === null ? null : Number(summary.alertPaise),
    lowBalance: summary.lowBalance,
    prices: usage.map((u) => ({ code: u.code, name: u.name, pricePaise: Number(u.pricePaise), gstPaise: Number(u.gstPaise), listPricePaise: Number(u.listPricePaise), planPrice: u.planPrice })),
    ledger: entries.map((e) => ({
      id: e.id, at: e.at.toISOString(), type: e.type, source: e.source, itemName: e.itemName,
      amountPaise: Number(e.amountPaise), balanceAfterPaise: e.balanceAfterPaise === null ? null : Number(e.balanceAfterPaise), note: e.type === "topup" ? e.note : null,
    })),
    invoices: invoices.map((i) => ({ id: i.id, number: i.number, issuedAt: i.issuedAt.toISOString(), description: i.description, totalPaise: Number(i.totalPaise) })),
  };
  // Remount when the figures change (after a payment or a setting), so local state starts from the new data.
  const key = `${data.walletPaise}:${data.plan?.endsAt}:${data.plan?.autoRenew}:${data.alertPaise}:${data.ledger[0]?.id}:${data.invoices.length}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("billing.page.eyebrow")}
        title={<>{t("billing.page.titleLead")} <GradientText>{t("billing.page.titleAccent")}</GradientText></>}
        description={t("billing.page.description")}
      />
      {order.success ? <PaymentStatus orderId={order.data} /> : null}
      <BillingManager key={key} data={data} openTopup={sp.topup === "1" && !order.success} />
    </div>
  );
}
