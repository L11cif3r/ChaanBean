"use client";

import { useTranslations } from "next-intl";
import { Gavel, ListChecks, Search, ShieldAlert, Siren, UserCheck } from "lucide-react";
import { Carousel, HowItWorks, SectionLabel, StatCard } from "@/components/ui";
import { ExampleBadge } from "@/components/checks/report-preview";
import type { CaseMatchView } from "@/server/cases/service";
import { MatchRow } from "./case-results";

// Case Check before a company is chosen: what each search looks for, three plain steps, and an example result with
// made-up cases so the user sees the matches table and the review buttons before paying.

const CHECKS = [
  { key: "court", icon: Gavel },
  { key: "fir", icon: Siren },
  { key: "aml", icon: ShieldAlert },
] as const;
const STEPS = [
  { key: "search", icon: Search },
  { key: "tick", icon: ListChecks },
  { key: "review", icon: UserCheck },
] as const;

const EXAMPLE: CaseMatchView[] = [
  {
    id: "ex-1", source: "court", caseNo: "CC 1234/2025", court: "Metropolitan Magistrate Court, Bengaluru", caseType: "Cheque bounce (NI Act s.138)",
    filedOn: "2025-03-11", status: "Pending", pending: true, nextHearing: "2026-11-18",
    parties: [{ role: "complainant", name: "Sample Steels LLP" }, { role: "accused", name: "Example Traders Pvt Ltd" }],
    acts: ["Negotiable Instruments Act, 1881 s.138"], recovery: true, listName: null, listDate: null, score: 92, confidence: "high", details: {},
    review: "pending", reviewedBy: null, reviewedAt: null,
  },
  {
    id: "ex-2", source: "court", caseNo: "OS 567/2022", court: "City Civil Court, Bengaluru", caseType: "Money recovery suit",
    filedOn: "2022-08-02", status: "Disposed", pending: false, nextHearing: null,
    parties: [{ role: "petitioner", name: "Demo Finance Ltd" }, { role: "respondent", name: "Example Traders" }],
    acts: ["Code of Civil Procedure, Order 37"], recovery: true, listName: null, listDate: null, score: 71, confidence: "medium", details: {},
    review: "not_this_person", reviewedBy: null, reviewedAt: null,
  },
  {
    id: "ex-3", source: "court", caseNo: "CRL 89/2024", court: "District Court, Mysuru", caseType: "Criminal complaint",
    filedOn: "2024-01-19", status: "Pending", pending: true, nextHearing: "2026-12-02",
    parties: [{ role: "accused", name: "Example Trading Co" }], acts: ["IPC s.420"], recovery: false, listName: null, listDate: null,
    score: 48, confidence: "low", details: {}, review: "unsure", reviewedBy: null, reviewedAt: null,
  },
];

export function CaseStart() {
  const t = useTranslations("cases.start");
  const tc = useTranslations("cases");
  return (
    <div className="space-y-6">
      <Carousel label={t("checksLabel")} slide="basis-[80%] md:basis-[calc((100%-1.5rem)/3)]" controls="dots">
        {CHECKS.map(({ key, icon: Icon }, i) => (
          <div key={key} className="h-full rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <span className={i === 0 ? "flex size-10 items-center justify-center rounded-xl bg-brand text-white shadow-orange" : "flex size-10 items-center justify-center rounded-xl bg-soft text-primary-text"} aria-hidden="true"><Icon size={18} /></span>
            <p className="mt-3 font-head text-[15px] font-extrabold text-text">{t(`checks.${key}.title`)}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted">{t(`checks.${key}.body`)}</p>
          </div>
        ))}
      </Carousel>

      <HowItWorks
        stepLabel={(n) => t("stepN", { n })}
        steps={STEPS.map(({ key, icon: Icon }) => ({ icon: <Icon />, title: t(`steps.${key}.title`), body: t(`steps.${key}.body`) }))}
      />

      <section aria-labelledby="case-preview" className="space-y-3">
        <div>
          <SectionLabel>{t("previewEyebrow")}</SectionLabel>
          <h2 id="case-preview" className="mt-2 text-xl font-extrabold tracking-tight text-text">{t("previewTitle")}</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-muted">{t("previewLead")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label={tc("count.matches")} value={3} />
          <StatCard label={tc("count.pending")} value={2} />
          <StatCard label={tc("count.disposed")} value={1} />
          <StatCard label={tc("count.notReviewed")} value={1} />
        </div>
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-semibold text-text">{tc("matchesTitle")}</h3>
            <ExampleBadge />
          </div>
          <div className="overflow-x-auto px-4 py-2">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-border text-[11px] uppercase tracking-[1px] text-subtle">
                <tr>
                  {(["case", "court", "type", "filed", "status", "match", "review"] as const).map((c) => (
                    <th key={c} scope="col" className="py-2 pr-3 font-medium">{tc(`col.${c}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {EXAMPLE.map((m) => (
                  <MatchRow key={m.id} m={m} day={(d) => (d ? d.split("-").reverse().join("/") : "—")} open={false} onToggle={() => undefined} canReview={false} saving={false} onReview={() => undefined} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-3 text-xs text-muted">{tc("onlyConfirmed")}</p>
        </div>
      </section>
    </div>
  );
}
