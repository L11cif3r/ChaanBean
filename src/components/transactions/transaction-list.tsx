"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronRight, FilePenLine, Hourglass, Plus, Send, ShieldCheck, Wallet } from "lucide-react";
import { ButtonLink, Card, Carousel, EmptyState, GradientText, HowItWorks, PageHeader, Segmented, StatCard, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { ExampleBadge } from "@/components/checks/report-preview";
import { formatDate } from "@/lib/dates";
import { formatInr, formatInrShort } from "@/lib/money";
import type { TxStatus } from "@/lib/transactions";
import { STATUS_TONE } from "./transaction-detail";
import type { listTransactions } from "@/server/transactions/service";

// Business Security list: totals at the top, a filter, then a table on large screens and cards on phones. With no
// agreements yet: three plain steps and a faded, labelled example list.

type Row = Awaited<ReturnType<typeof listTransactions>>[number];

const FILTERS: { key: string; statuses: TxStatus[] | null }[] = [
  { key: "all", statuses: null },
  { key: "waiting", statuses: ["draft", "sent", "viewed", "changes_requested"] },
  { key: "running", statuses: ["active", "partially_paid"] },
  { key: "overdue", statuses: ["overdue"] },
  { key: "closed", statuses: ["paid", "settled", "rejected", "expired", "cancelled"] },
];

export function TransactionList({ rows, canCreate }: { rows: Row[]; canCreate: boolean }) {
  const t = useTranslations("transactions");
  const [filter, setFilter] = useState("all");
  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)?.statuses;
    return f ? rows.filter((r) => f.includes(r.status)) : rows;
  }, [rows, filter]);
  const stats = useMemo(() => {
    const running = rows.filter((r) => ["active", "partially_paid", "overdue"].includes(r.status));
    return {
      running: running.length,
      value: running.reduce((s, r) => s + Number(r.totalPaise), 0),
      waiting: rows.filter((r) => ["draft", "sent", "viewed", "changes_requested"].includes(r.status)).length,
      overdue: rows.filter((r) => r.status === "overdue").length,
    };
  }, [rows]);
  const action = canCreate ? <ButtonLink href="/transactions/new"><Plus size={16} aria-hidden="true" /> {t("newAgreement")}</ButtonLink> : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("listEyebrow")}
        title={t.rich("listHeading", { accent: (c) => <GradientText>{c}</GradientText> })}
        description={t("listSubtitle")}
        actions={action}
      />
      {!rows.length ? (
        <IntroSteps
          label={t("intro.stepsLabel")}
          stepLabel={(n) => t("intro.step", { n })}
          steps={[
            { icon: <FilePenLine />, title: t("intro.s1.title"), body: t("intro.s1.body") },
            { icon: <Send />, title: t("intro.s2.title"), body: t("intro.s2.body") },
            { icon: <ShieldCheck />, title: t("intro.s3.title"), body: t("intro.s3.body") },
          ]}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t("stats.running")} value={stats.running} icon={<ShieldCheck />} />
            <StatCard label={t("stats.value")} value={formatInrShort(BigInt(stats.value))} icon={<Wallet />} />
            <StatCard label={t("stats.waiting")} value={stats.waiting} icon={<Hourglass />} />
            <StatCard label={t("stats.overdue")} value={stats.overdue} icon={<AlertTriangle />} />
          </div>
          <Segmented label={t("filter")} value={filter} onChange={setFilter} items={FILTERS.map((f) => ({ key: f.key, label: t(`filters.${f.key}`) }))} />
        </>
      )}
      <Card className="overflow-hidden">
        {!rows.length ? (
          <ExampleList />
        ) : !shown.length ? (
          <EmptyState title={t("noneHere")} />
        ) : (
          <>
            <ul className="divide-y divide-border sm:hidden">
              {shown.map((r) => (
                <li key={r.id}>
                  <MobileRow
                    href={`/transactions/${r.id}`}
                    reference={r.reference}
                    name={r.counterparty.name}
                    amount={formatInr(BigInt(r.totalPaise))}
                    sub={`${t(`typeShort.${r.type}`)} · ${t("col.due")} ${formatDate(r.dueDate)}`}
                    tag={<Tag tone={STATUS_TONE[r.status]}>{t(`status.${r.status}`)}</Tag>}
                  />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-[1px] text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">{t("col.reference")}</th>
                    <th scope="col" className="px-2 py-3 font-medium">{t("col.counterparty")}</th>
                    <th scope="col" className="px-2 py-3 font-medium">{t("col.type")}</th>
                    <th scope="col" className="px-2 py-3 text-right font-medium">{t("col.total")}</th>
                    <th scope="col" className="px-2 py-3 font-medium">{t("col.due")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("col.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shown.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-hover">
                      <td className="px-5 py-3"><Link href={`/transactions/${r.id}`} className="font-medium text-text hover:text-primary-text">{r.reference}</Link></td>
                      <td className="max-w-[16rem] truncate px-2 py-3 text-text-2">{r.counterparty.name}</td>
                      <td className="px-2 py-3 text-text-2" title={t(`type.${r.type}`)}>{t(`typeShort.${r.type}`)}</td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums text-text">{formatInr(BigInt(r.totalPaise))}</td>
                      <td className="px-2 py-3 tabular-nums text-text-2">{formatDate(r.dueDate)}</td>
                      <td className="px-5 py-3"><Tag tone={STATUS_TONE[r.status]}>{t(`status.${r.status}`)}</Tag></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/** The three intro steps: a swipeable carousel on phones, a row of cards from tablet width (shared). */
export function IntroSteps({ label, stepLabel, steps }: { label: string; stepLabel: (n: number) => ReactNode; steps: { icon: ReactNode; title: ReactNode; body: ReactNode }[] }) {
  return (
    <>
      <div className="sm:hidden">
        <Carousel label={label} slide="basis-[85%]" controls="dots">
          {steps.map((s, i) => (
            <div key={i} className="flex h-full items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-primary-text [&_svg]:size-[17px]" aria-hidden="true">{s.icon}</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-subtle">{stepLabel(i + 1)}</span>
                <span className="mt-1 block text-sm font-semibold text-text">{s.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">{s.body}</span>
              </span>
            </div>
          ))}
        </Carousel>
      </div>
      <HowItWorks className="hidden sm:grid" stepLabel={stepLabel} steps={steps} />
    </>
  );
}

/** One row as a tappable card on phones (shared with the settlements list). */
export function MobileRow({ href, reference, name, amount, sub, tag, faded }: { href?: string; reference: string; name: string; amount: string; sub: string; tag: ReactNode; faded?: boolean }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-text">{name}</span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-text">{amount}</span>
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-muted">{reference} · {sub}</span>
          {tag}
        </span>
      </span>
      {href ? <ChevronRight size={16} className="shrink-0 text-subtle" aria-hidden="true" /> : null}
    </>
  );
  const cls = cn("flex min-h-16 items-center gap-2 px-4 py-3", faded && "opacity-75");
  return href ? <Link href={href} className={cn(cls, "transition-colors hover:bg-hover active:bg-hover")}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

const EXAMPLE_ROWS: { reference: string; name: string; type: "seller" | "buyer" | "lender"; total: number; due: string; status: TxStatus }[] = [
  { reference: "CHB-TX-000101", name: "Example Traders Pvt Ltd", type: "seller", total: 4_72_000_00, due: "2026-11-30", status: "active" },
  { reference: "CHB-TX-000102", name: "Sample Steels LLP", type: "seller", total: 1_18_000_00, due: "2026-10-15", status: "overdue" },
  { reference: "CHB-TX-000103", name: "Demo Retail", type: "buyer", total: 65_000_00, due: "2026-12-20", status: "sent" },
];

/** What the list looks like with agreements in it, made up and labelled, for a business that has none yet. */
function ExampleList() {
  const t = useTranslations("transactions");
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-head text-sm font-bold text-text">{t("none")}</p>
          <p className="text-xs text-muted">{t("noneBody")}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("intro.exampleTitle")}</p>
        <ExampleBadge />
      </div>
      <ul className="divide-y divide-border sm:hidden" aria-label={t("intro.exampleTitle")}>
        {EXAMPLE_ROWS.map((r) => (
          <li key={r.reference}>
            <MobileRow faded reference={r.reference} name={r.name} amount={formatInr(BigInt(r.total))} sub={formatDate(r.due)} tag={<Tag tone={STATUS_TONE[r.status]}>{t(`status.${r.status}`)}</Tag>} />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto opacity-75 sm:block" aria-label={t("intro.exampleTitle")}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <tbody className="divide-y divide-border">
            {EXAMPLE_ROWS.map((r) => (
              <tr key={r.reference}>
                <td className="px-4 py-3 font-medium text-text">{r.reference}</td>
                <td className="px-2 py-3 text-text-2">{r.name}</td>
                <td className="px-2 py-3 text-text-2">{t(`typeShort.${r.type}`)}</td>
                <td className="px-2 py-3 text-right font-semibold tabular-nums text-text">{formatInr(BigInt(r.total))}</td>
                <td className="px-2 py-3 tabular-nums text-text-2">{formatDate(r.due)}</td>
                <td className="px-4 py-3"><Tag tone={STATUS_TONE[r.status]}>{t(`status.${r.status}`)}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted">{t("intro.exampleNote")}</p>
    </div>
  );
}
