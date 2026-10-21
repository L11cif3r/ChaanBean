"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarClock, Handshake, Hourglass, Plus, Send, Wallet } from "lucide-react";
import { ButtonLink, Card, EmptyState, GradientText, PageHeader, Segmented, StatCard, Tag, type Tone } from "@/components/ui";
import { IntroSteps, MobileRow } from "@/components/transactions/transaction-list";
import { ExampleBadge } from "@/components/checks/report-preview";
import { formatDate } from "@/lib/dates";
import { formatInr, formatInrShort } from "@/lib/money";
import type { SettlementStatus } from "@/lib/settlements";
import type { listSettlements } from "@/server/settlements/service";

// E-Settlement list (STL): every settlement with what is to be paid, how, the next instalment and its status.

type Row = Awaited<ReturnType<typeof listSettlements>>[number];

export const SETTLEMENT_TONE: Record<SettlementStatus, Tone> = {
  draft: "neutral", sent: "info", viewed: "info", counter_proposed: "warning", accepted: "success", completed: "success",
  defaulted: "danger", rejected: "danger", expired: "neutral", cancelled: "neutral",
};

const FILTERS: { key: string; statuses: SettlementStatus[] | null }[] = [
  { key: "all", statuses: null },
  { key: "waiting", statuses: ["draft", "sent", "viewed", "counter_proposed"] },
  { key: "running", statuses: ["accepted"] },
  { key: "defaulted", statuses: ["defaulted"] },
  { key: "closed", statuses: ["completed", "rejected", "expired", "cancelled"] },
];

export function SettlementList({ rows, canCreate }: { rows: Row[]; canCreate: boolean }) {
  const t = useTranslations("settlements");
  const [filter, setFilter] = useState("all");
  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)?.statuses;
    return f ? rows.filter((r) => f.includes(r.status)) : rows;
  }, [rows, filter]);
  const stats = useMemo(() => {
    const running = rows.filter((r) => r.status === "accepted");
    return {
      running: running.length,
      value: running.reduce((s, r) => s + Number(r.toPayPaise), 0),
      waiting: rows.filter((r) => ["draft", "sent", "viewed", "counter_proposed"].includes(r.status)).length,
      defaulted: rows.filter((r) => r.status === "defaulted").length,
    };
  }, [rows]);
  const action = canCreate ? <ButtonLink href="/settlements/new"><Plus size={16} aria-hidden="true" /> {t("newSettlement")}</ButtonLink> : null;
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
            { icon: <Handshake />, title: t("intro.s1.title"), body: t("intro.s1.body") },
            { icon: <Send />, title: t("intro.s2.title"), body: t("intro.s2.body") },
            { icon: <CalendarClock />, title: t("intro.s3.title"), body: t("intro.s3.body") },
          ]}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t("stats.running")} value={stats.running} icon={<CalendarClock />} />
            <StatCard label={t("stats.value")} value={formatInrShort(BigInt(stats.value))} icon={<Wallet />} />
            <StatCard label={t("stats.waiting")} value={stats.waiting} icon={<Hourglass />} />
            <StatCard label={t("stats.defaulted")} value={stats.defaulted} icon={<AlertTriangle />} />
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
                    href={`/settlements/${r.id}`}
                    reference={r.reference}
                    name={r.counterparty.name}
                    amount={formatInr(BigInt(r.toPayPaise))}
                    sub={`${r.mode === "full" ? t("modeName.full") : t("instalmentsN", { count: r.instalments })}${r.nextDue ? ` · ${t("col.next")} ${formatDate(r.nextDue)}` : ""}`}
                    tag={<Tag tone={SETTLEMENT_TONE[r.status]}>{t(`status.${r.status}`)}</Tag>}
                  />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-[1px] text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">{t("col.reference")}</th>
                    <th scope="col" className="px-2 py-3 font-medium">{t("col.debtor")}</th>
                    <th scope="col" className="px-2 py-3 font-medium">{t("col.settles")}</th>
                    <th scope="col" className="px-2 py-3 text-right font-medium">{t("col.toPay")}</th>
                    <th scope="col" className="px-2 py-3 font-medium">{t("col.mode")}</th>
                    <th scope="col" className="px-2 py-3 font-medium">{t("col.next")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("col.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shown.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-hover">
                      <td className="px-5 py-3"><Link href={`/settlements/${r.id}`} className="font-medium text-text hover:text-primary-text">{r.reference}</Link></td>
                      <td className="px-2 py-3 text-text-2">{r.counterparty.name}</td>
                      <td className="px-2 py-3 text-text-2">{r.original ? <Link href={`/transactions/${r.original.id}`} className="hover:text-primary-text">{r.original.reference}</Link> : t("outsideBill", { bill: r.outsideBillNo ?? "" })}</td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums text-text">{formatInr(BigInt(r.toPayPaise))}</td>
                      <td className="px-2 py-3 text-text-2">{r.mode === "full" ? t("modeName.full") : t("instalmentsN", { count: r.instalments })}</td>
                      <td className="px-2 py-3 tabular-nums text-text-2">{r.nextDue ? formatDate(r.nextDue) : "—"}</td>
                      <td className="px-5 py-3"><Tag tone={SETTLEMENT_TONE[r.status]}>{t(`status.${r.status}`)}</Tag></td>
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

const EXAMPLE_ROWS: { reference: string; name: string; settles: string; toPay: number; instalments: number; next: string | null; status: SettlementStatus }[] = [
  { reference: "CHB-ST-000021", name: "Sample Steels LLP", settles: "CHB-TX-000102", toPay: 1_00_000_00, instalments: 4, next: "2026-11-05", status: "accepted" },
  { reference: "CHB-ST-000022", name: "Demo Retail", settles: "INV-2291", toPay: 38_500_00, instalments: 1, next: null, status: "sent" },
];

/** What the list looks like with settlements in it, made up and labelled, for a business that has none yet. */
function ExampleList() {
  const t = useTranslations("settlements");
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
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
            <MobileRow faded reference={r.reference} name={r.name} amount={formatInr(BigInt(r.toPay))} sub={r.instalments > 1 ? t("instalmentsN", { count: r.instalments }) : t("modeName.full")} tag={<Tag tone={SETTLEMENT_TONE[r.status]}>{t(`status.${r.status}`)}</Tag>} />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto opacity-75 sm:block" aria-label={t("intro.exampleTitle")}>
        <table className="w-full min-w-[46rem] text-left text-sm">
          <tbody className="divide-y divide-border">
            {EXAMPLE_ROWS.map((r) => (
              <tr key={r.reference}>
                <td className="px-4 py-3 font-medium text-text">{r.reference}</td>
                <td className="px-2 py-3 text-text-2">{r.name}</td>
                <td className="px-2 py-3 text-text-2">{r.settles}</td>
                <td className="px-2 py-3 text-right tabular-nums text-text-2">{formatInr(BigInt(r.toPay))}</td>
                <td className="px-2 py-3 text-text-2">{r.instalments > 1 ? t("instalmentsN", { count: r.instalments }) : t("modeName.full")}</td>
                <td className="px-2 py-3 tabular-nums text-text-2">{r.next ? formatDate(r.next) : "—"}</td>
                <td className="px-4 py-3"><Tag tone={SETTLEMENT_TONE[r.status]}>{t(`status.${r.status}`)}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted">{t("intro.exampleNote")}</p>
    </div>
  );
}
