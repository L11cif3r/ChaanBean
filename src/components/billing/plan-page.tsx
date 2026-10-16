import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ButtonLink, Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { billingGstin, billingSummary, loadCatalogue } from "@/server/billing/service";
import { getContext } from "@/server/context";
import { PaymentStatus } from "./payment-status";
import { PlanPicker, type PickerPlan } from "./plan-picker";

/**
 * S03 content for both routes: /signup/plan at the end of sign-up and /account/plan/change from the account. Reads the
 * session, so callers render it inside <Suspense>.
 */
export async function PlanPageContent({ searchParams, returnTo }: { searchParams: Promise<Record<string, string | string[] | undefined>>; returnTo: "signup" | "change" }) {
  const ctx = await getContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.orgId) redirect("/signup/business");
  if (!can(ctx.role, "billing.manage")) {
    const t = await getTranslations("billing.choose");
    const tp = await getTranslations("billing.payment");
    return (
      <Card>
        <EmptyState
          title={t("noAccessTitle")}
          body={t("noAccessBody")}
          action={
            <ButtonLink href="/dashboard" size="sm">
              {tp("goToDashboard")}
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const order = z.uuid().safeParse((await searchParams).order);
  const [catalogue, summary, gstin] = await Promise.all([loadCatalogue(), billingSummary(ctx.orgId), billingGstin(ctx.orgId)]);
  const plans: PickerPlan[] = catalogue.plans.map((p) => ({
    code: p.code, name: p.name, recommended: p.recommended,
    pricePaise: Number(p.pricePaise), gstPaise: Number(p.gstPaise), totalPaise: Number(p.totalPaise),
    periodMonths: p.periodMonths, seats: p.seats, items: p.items,
  }));

  return (
    <div className="space-y-6">
      {order.success ? <PaymentStatus orderId={order.data} doneHref="/dashboard" /> : null}
      <PlanPicker
        plans={plans}
        billingGstin={gstin}
        returnTo={returnTo}
        current={summary.plan ? { name: summary.plan.name, endsAt: summary.plan.endsAt.toISOString() } : null}
        decideLaterHref={returnTo === "signup" ? "/dashboard" : undefined}
      />
    </div>
  );
}
