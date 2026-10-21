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
      <Pill href={href} className="gap-2 pl-1.5 pr-2.5">
        <span className="flex size-6 items-center justify-center rounded-lg bg-brand text-white" aria-hidden="true">
          <Wallet size={13} strokeWidth={2.5} />
        </span>
        <span className="text-subtle" aria-hidden="true">{t("walletLabel")}</span>
        <span className="sr-only">{t("wallet", { amount })}</span>
        <span className={summary.lowBalance ? "font-bold tabular-nums text-warning-fg" : "font-bold tabular-nums text-text"} aria-hidden="true">
          {amount}
        </span>
      </Pill>
    </>
  );
}
