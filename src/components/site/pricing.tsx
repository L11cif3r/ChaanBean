import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { formatInr } from "@/lib/money";
import { loadCatalogue } from "@/server/billing/service";

// Landing page pricing, read live from the price list (PRD v3.0 Appendix A, editable by ops): Plan A and Plan B with
// their headline quantities, pay per use with a few example prices, and a custom plan.

const PAYG_EXAMPLES = ["CW_GST_SEARCH", "CW_CIBIL_COMPANY", "CC_COURT", "BS_SELLER_TX", "BS_SETTLEMENT"];
const inr = (paise: bigint) => formatInr(paise);

export async function Pricing() {
  await connection(); // prices can change: read them on each request, not at build time
  const t = await getTranslations("landing.pricing");
  const { plans, items } = await loadCatalogue().catch(() => ({ plans: [], items: [] }));
  if (!plans.length) return <p className="mt-10 text-center text-muted">{t("unavailable")}</p>;
  const examples = PAYG_EXAMPLES.map((c) => items.find((i) => i.code === c)).filter((i): i is (typeof items)[number] => Boolean(i));

  return (
    <>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          return (
            <article key={p.code} className={cn("relative flex flex-col rounded-[24px] border bg-surface p-6", p.recommended ? "border-primary shadow-[0_24px_50px_-30px_rgba(255,82,0,0.6)]" : "border-border")}>
              {p.recommended ? <span className="absolute -top-3 left-6 rounded-full bg-[image:var(--grad-brand)] px-3 py-1 text-xs font-bold text-white">{t("recommended")}</span> : null}
              <h3 className="text-lg font-extrabold text-text">{p.name}</h3>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-text tabular-nums">{inr(p.pricePaise)}</p>
              <p className="text-sm text-muted">{t("perPeriod", { months: p.periodMonths })} · {t("plusGst", { gst: inr(p.gstPaise) })}</p>
              <p className="mt-4 rounded-xl bg-primary-softer px-3 py-2 text-sm font-semibold text-primary-text">{t("toWallet", { amount: inr(p.totalPaise) })}</p>
              <p className="mt-3 text-sm font-semibold text-text-2">{t("users", { count: p.seats })}</p>
              <ul className="mt-4 flex-1 space-y-1.5">
                {[t("planPrices"), t("allChecks")].map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-text-2"><Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> {b}</li>
                ))}
              </ul>
              <Link href="/login" className={buttonClass(p.recommended ? "primary" : "secondary", "md", "mt-6 w-full")}>{t("choose", { name: p.name })}</Link>
            </article>
          );
        })}

        <article className="flex flex-col rounded-[24px] border border-border bg-surface p-6">
          <h3 className="text-lg font-extrabold text-text">{t("payg.name")}</h3>
          <p className="mt-3 text-sm text-text-2">{t("payg.lead")}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-subtle">{t("payg.examples")}</p>
          <ul className="mt-2 flex-1 space-y-1.5">
            {examples.map((i) => (
              <li key={i.code} className="flex justify-between gap-3 text-sm text-text-2"><span>{i.name}</span><span className="shrink-0 font-semibold tabular-nums">{formatInr(i.pricePaise, { withPaise: i.pricePaise % 100n !== 0n })}</span></li>
            ))}
          </ul>
          <Link href="/login" className={buttonClass("secondary", "md", "mt-6 w-full")}>{t("payg.cta")}</Link>
        </article>

        <article className="flex flex-col rounded-[24px] border border-dashed border-border-strong bg-surface p-6">
          <h3 className="text-lg font-extrabold text-text">{t("custom.name")}</h3>
          <p className="mt-3 flex-1 text-sm text-text-2">{t("custom.lead")}</p>
          <Link href="/login" className={buttonClass("secondary", "md", "mt-6 w-full")}>{t("custom.cta")}</Link>
        </article>
      </div>
      <p className="mt-6 text-center text-xs text-muted">{t("gstNote")}</p>
    </>
  );
}
