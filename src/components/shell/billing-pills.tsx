import { getTranslations } from "next-intl/server";
import { Wallet } from "lucide-react";
import { Pill } from "@/components/ui";
import { formatInr } from "@/lib/money";
import { can } from "@/lib/permissions";
import { loadAccount } from "@/server/account";
import { billingSummary } from "@/server/billing/service";

/**
 * Top-bar plan and wallet pills (S19 entry point "plan pill in the top bar"). Every member sees them; only Owners and
 * Admins, who can open S19, get links. Rendered inside Suspense because it reads the session.
 */
export async function BillingPills() {
  const { ctx } = await loadAccount();
  if (!ctx.orgId) return null;
  const [t, summary] = await Promise.all([getTranslations("topbar"), billingSummary(ctx.orgId)]);
  const href = can(ctx.role, "billing.manage") ? "/account/billing" : undefined;
  const amount = formatInr(summary.walletPaise, { withPaise: true });
  return (
    <>
      <Pill href={href} className="hidden md:inline-flex">
        {summary.plan ? t("planUnits", { plan: summary.plan.name, units: summary.unitsLeft }) : t("noPlan")}
      </Pill>
      <Pill href={href} className="h-11 gap-2.5 border-2 pl-1.5 pr-3.5">
        <span className="flex items-center justify-center rounded-lg bg-primary p-1.5 text-white shadow-sm" aria-hidden="true">
          <Wallet size={16} strokeWidth={2.5} />
        </span>
        <span className="flex flex-col text-left leading-tight">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">{t("walletLabel")}</span>
          <span className="sr-only">{t("wallet", { amount })}</span>
          <span className={summary.lowBalance ? "font-mono text-sm font-black tracking-tight text-warning-fg" : "font-mono text-sm font-black tracking-tight text-primary-text"} aria-hidden="true">
            {amount}
          </span>
        </span>
      </Pill>
    </>
  );
}
