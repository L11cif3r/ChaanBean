import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { ArrowLeftRight, ArrowRight, Building2, Check, Handshake, IndianRupee, Scale, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardBody, CardHeader, Carousel, GradientText, PageHeader, SectionLabel, StatCard, Tag, type Tone } from "@/components/ui";
import { formatDate, istDate } from "@/lib/dates";
import { formatInrShort } from "@/lib/money";
import { loadAccount } from "@/server/account";
import { dashboardSummary } from "@/server/dashboard";

// S04: what ChaanBean does in plain words, the organisation's numbers, the four features as tiles, recent reports and
// the getting-started checklist until it is done.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S04.title") };
}

// The page reads the session, so it streams behind its own boundary and client navigations into it stay instant.
export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

const FEATURES = [
  { key: "cw", href: "/checks/new", icon: ShieldCheck },
  { key: "cc", href: "/cases", icon: Scale },
  { key: "bs", href: "/transactions", icon: ArrowLeftRight },
  { key: "es", href: "/settlements", icon: Handshake },
] as const;

const RISK_TONE: Record<string, Tone> = { low: "success", medium: "warning", high: "danger", not_enough_data: "neutral", none: "info" };

async function Dashboard() {
  const t = await getTranslations("dashboard");
  const { ctx, profile, orgs } = await loadAccount();
  const org = orgs.find((o) => o.id === ctx.orgId);
  const firstName = profile?.fullName.split(" ")[0];
  const canAct = ctx.role !== "viewer";
  const summary = ctx.orgId ? await dashboardSummary(ctx.orgId) : null;

  const steps = [
    { key: "counterparty", href: "/counterparties/new", show: canAct, done: (summary?.counterparties ?? 0) > 0 },
    { key: "check", href: "/checks/new", show: canAct, done: (summary?.recent.length ?? 0) > 0 },
    { key: "teammate", href: "/account/team", show: ctx.role === "owner" || ctx.role === "admin", done: false },
    { key: "transaction", href: "/transactions/new", show: canAct, done: (summary?.openTransactions ?? 0) > 0 },
  ].filter((s) => s.show);
  const allDone = steps.every((s) => s.done);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={firstName ? <>{t("greetingLead")} <GradientText>{firstName}</GradientText></> : t("greetingNoName")}
        description={t("intro")}
      />
      {org?.verification === "unverified" ? (
        <p role="status" className="rounded-xl border border-info/20 bg-info-bg px-3.5 py-2.5 text-sm text-info-fg">
          {t("verificationPending")}
        </p>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={t("stats.counterparties")} value={summary.counterparties} hint={t("stats.cpsHint")} href="/counterparties" icon={<Building2 />} />
          <StatCard label={t("stats.checksThisMonth")} value={summary.checksThisMonth} hint={t("stats.checksHint")} href="/checks/history" icon={<ShieldCheck />} />
          <StatCard label={t("stats.highRisk")} value={summary.highRisk} hint={t("stats.highHint")} href="/checks/history" icon={<TriangleAlert />} />
          <StatCard
            label={t("stats.outstanding")}
            value={formatInrShort(BigInt(summary.outstandingPaise))}
            hint={summary.overdue ? t("stats.outstandingHint", { count: summary.overdue }) : t("stats.openHint", { count: summary.openTransactions })}
            href="/transactions"
            icon={<IndianRupee />}
          />
        </div>
      ) : null}

      <section aria-labelledby="dash-features" className="space-y-3">
        <SectionLabel>
          <span id="dash-features">{t("featuresTitle")}</span>
        </SectionLabel>
        <Carousel label={t("featuresTitle")} slide="basis-[78%] sm:basis-[calc((100%-0.75rem)/2)] xl:basis-[calc((100%-2.25rem)/4)]" controls="dots">
          {FEATURES.map(({ key, href, icon: Icon }, i) => (
            <Link
              key={key}
              href={href}
              className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-primary-line hover:shadow-md"
            >
              <span className="pointer-events-none absolute -right-10 -top-10 -z-10 size-32 rounded-full bg-soft opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
              <div className="flex items-center justify-between gap-2">
                <span className={i === 0 ? "flex size-10 items-center justify-center rounded-xl bg-brand text-white shadow-orange" : "flex size-10 items-center justify-center rounded-xl bg-soft text-primary-text"} aria-hidden="true">
                  <Icon size={19} />
                </span>
                <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10.5px] font-semibold text-muted">{t(`features.${key}.when`)}</span>
              </div>
              <p className="mt-3 font-head text-[15px] font-extrabold text-text">{t(`features.${key}.title`)}</p>
              <p className="mt-1 flex-1 text-[13px] leading-snug text-muted">{t(`features.${key}.body`)}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-primary-text">
                {t(`features.${key}.cta`)}
                <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </Carousel>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader title={t("recentTitle")} action={<Link href="/checks/history" className="text-xs font-medium text-muted hover:text-text">{t("viewAll")}</Link>} />
          {summary?.recent.length ? (
            <ul className="divide-y divide-border">
              {summary.recent.map((r) => (
                <li key={r.id}>
                  <Link href={r.tab === "credit_worthiness" ? `/reports/${r.id}` : `/cases/${r.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover sm:px-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-primary-text" aria-hidden="true">
                      {r.tab === "credit_worthiness" ? <ShieldCheck size={15} /> : <Scale size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text">{r.company}</span>
                      <span className="block text-xs text-subtle">{r.reportNo} · {formatDate(istDate(new Date(r.createdAt)))}</span>
                    </span>
                    <Tag tone={RISK_TONE[r.riskLevel ?? "none"]}>{t(`risk.${r.riskLevel ?? "none"}`)}</Tag>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <CardBody>
              <p className="text-sm text-muted">{t("recentEmpty")}</p>
            </CardBody>
          )}
        </Card>

        {steps.length && !allDone ? (
          <Card>
            <CardHeader title={t("checklistTitle")} action={<Tag tone="info">{t("gettingStarted")}</Tag>} />
            <CardBody>
              <ol className="space-y-3">
                {steps.map((s, i) => (
                  <li key={s.key} className="flex items-start gap-3">
                    <span
                      className={
                        s.done
                          ? "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-success-bg text-success-fg"
                          : "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white"
                      }
                    >
                      {s.done ? <Check size={13} aria-hidden="true" /> : i + 1}
                    </span>
                    <div className="min-w-0">
                      <Link href={s.href} className={s.done ? "text-sm text-muted line-through" : "text-sm font-semibold text-text hover:text-primary-text"}>
                        {t(`steps.${s.key}.title`)}
                      </Link>
                      <p className="text-xs text-muted">{t(`steps.${s.key}.body`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
