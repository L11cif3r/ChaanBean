"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { formatInrShort } from "@/lib/money";
import type { CibilData, CompanyData, DirectorData, GstSearchData, IecTurnoverData } from "@/lib/checks";

// Report graphics for every section with numbers (v4: "view the data as graphs", sample data included). Plain CSS and
// SVG, no chart library, the same look as the turnover chart. Each one has a text label for screen readers.

const short = (p: number) => formatInrShort(BigInt(Math.round(p)));
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (period: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(period) ?? /^(\d{2})(\d{4})$/.exec(period);
  if (!m) return period;
  const [y, mo] = period.includes("-") ? [m[1], m[2]] : [m[2], m[1]];
  return `${MONTH[Number(mo) - 1] ?? mo} ${y.slice(2)}`;
};

/** GSTR-3B for the last 12 months as a strip: on time, late or not filed, oldest on the left. */
export function FilingStrip({ filings }: { filings: GstSearchData["filings"] }) {
  const t = useTranslations("report.chart");
  const months = [...filings.slice(0, 12)].reverse();
  const tone = (f: (typeof months)[number]) => (!f.filed ? "missing" : f.onTime ? "ontime" : "late");
  const color = { ontime: "bg-success-fg", late: "bg-warning-fg", missing: "bg-danger-fg" } as const;
  return (
    <figure className="space-y-2">
      <figcaption className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("filingsTitle")}</figcaption>
      <div className="grid grid-cols-12 gap-1" role="img" aria-label={months.map((f) => `${monthLabel(f.period)}: ${t(`filing.${tone(f)}`)}`).join(", ")}>
        {months.map((f, i) => (
          <div key={f.period} className="flex min-w-0 flex-col items-center gap-1">
            <span title={`${monthLabel(f.period)}: ${t(`filing.${tone(f)}`)}`} className={cn("h-7 w-full origin-bottom animate-[cb-grow_0.5s_ease-out_both] rounded-md", color[tone(f)])} style={{ animationDelay: `${i * 30}ms` }} />
            <span className="truncate text-[9px] text-muted">{monthLabel(f.period).split(" ")[0]}</span>
          </div>
        ))}
      </div>
      <Legend items={[["bg-success-fg", t("filing.ontime")], ["bg-warning-fg", t("filing.late")], ["bg-danger-fg", t("filing.missing")]]} />
    </figure>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2">
      {items.map(([c, label]) => (
        <li key={label} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-sm", c)} aria-hidden="true" />{label}</li>
      ))}
    </ul>
  );
}

/** Score on its bureau scale (300 to 900, or CMR rank 1 to 10 where 1 is best), and loans: sanctioned, outstanding, overdue. */
export function CibilVisual({ d }: { d: CibilData }) {
  const t = useTranslations("report.chart");
  const n = Number(String(d.scoreOrRank).replace(/[^\d.]/g, ""));
  const rank = /cmr|rank/i.test(d.scoreOrRank) || (n >= 1 && n <= 10);
  const pos = !Number.isFinite(n) || !n ? null : rank ? (10 - Math.min(10, Math.max(1, n))) / 9 : (Math.min(900, Math.max(300, n)) - 300) / 600;
  const overdue = d.overdue.reduce((s, o) => s + o.amountPaise, 0);
  const max = Math.max(1, d.sanctionedPaise, d.outstandingPaise, overdue);
  const bars: [string, number, string][] = [
    [t("sanctioned"), d.sanctionedPaise, "bg-primary/40"],
    [t("outstandingBar"), d.outstandingPaise, "bg-primary"],
    [t("overdueBar"), overdue, overdue ? "bg-danger-fg" : "bg-surface-strong"],
  ];
  return (
    <div className="space-y-4">
      {pos !== null ? (
        <figure className="space-y-1.5">
          <figcaption className="flex justify-between text-[11px] font-medium uppercase tracking-[1px] text-subtle">
            <span>{rank ? t("rankScale") : t("scoreScale")}</span><span className="text-text">{d.scoreOrRank}</span>
          </figcaption>
          <div className="relative h-3 rounded-full bg-[linear-gradient(90deg,var(--danger-fg),var(--warning-fg),var(--success-fg))]" role="img" aria-label={`${d.bureau} ${d.scoreOrRank}`}>
            <span className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full border-2 border-surface bg-text shadow-md" style={{ left: `${pos * 100}%` }} aria-hidden="true" />
          </div>
          <div className="flex justify-between text-[10px] text-muted"><span>{rank ? t("rankWorst") : "300"}</span><span>{rank ? t("rankBest") : "900"}</span></div>
        </figure>
      ) : null}
      <figure className="space-y-1.5" role="img" aria-label={bars.map(([l, v]) => `${l}: ${short(v)}`).join(", ")}>
        {bars.map(([label, v, c], i) => (
          <div key={label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-2 text-xs">
            <span className="text-text-2">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-strong">
              <span className={cn("block h-full origin-left animate-[cb-grow-x_0.6s_ease-out_both] rounded-full", c)} style={{ width: `${Math.max(v ? 3 : 0, (v / max) * 100)}%`, animationDelay: `${i * 80}ms` }} />
            </span>
            <span className="text-right font-medium tabular-nums text-text">{short(v)}</span>
          </div>
        ))}
      </figure>
    </div>
  );
}

/** Import and export value by financial year, side by side. */
export function TradeChart({ d }: { d: IecTurnoverData }) {
  const t = useTranslations("report.chart");
  const years = [...d.years].sort((a, b) => a.fy.localeCompare(b.fy));
  const max = Math.max(1, ...years.flatMap((y) => [y.exportPaise, y.importPaise]));
  return (
    <figure className="space-y-2">
      <figcaption className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("tradeTitle")}</figcaption>
      <div className="flex h-40 items-end gap-3" role="img" aria-label={years.map((y) => `FY ${y.fy}: ${t("exports")} ${short(y.exportPaise)}, ${t("imports")} ${short(y.importPaise)}`).join("; ")}>
        {years.map((y, i) => (
          <div key={y.fy} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              {([[y.exportPaise, "bg-primary"], [y.importPaise, "bg-info-fg/70"]] as const).map(([v, c], k) => (
                <span key={k} title={short(v)} className={cn("w-1/2 max-w-6 origin-bottom animate-[cb-grow_0.6s_ease-out_both] rounded-t-md", c)} style={{ height: `${Math.max(3, (v / max) * 100)}%`, animationDelay: `${(i * 2 + k) * 50}ms` }} />
              ))}
            </div>
            <span className="truncate text-[11px] text-muted">FY {y.fy}</span>
          </div>
        ))}
      </div>
      <Legend items={[["bg-primary", t("exports")], ["bg-info-fg/70", t("imports")]]} />
      {d.topPorts.length ? <p className="text-xs text-muted">{t("topPorts", { ports: d.topPorts.slice(0, 3).join(", ") })}</p> : null}
    </figure>
  );
}

/** Paid-up against authorised capital, and loans against assets (open and satisfied) when the source has them. */
export function CompanyVisual({ d }: { d: CompanyData }) {
  const t = useTranslations("report.chart");
  const cap = d.authorisedCapitalPaise || d.paidUpCapitalPaise;
  const share = cap ? Math.min(1, d.paidUpCapitalPaise / cap) : 0;
  const open = d.charges.filter((c) => c.status === "Open").reduce((s, c) => s + c.amountPaise, 0);
  const satisfied = d.charges.filter((c) => c.status === "Satisfied").reduce((s, c) => s + c.amountPaise, 0);
  return (
    <div className="space-y-4">
      {cap ? (
        <figure className="space-y-1.5">
          <figcaption className="flex justify-between text-[11px] font-medium uppercase tracking-[1px] text-subtle">
            <span>{t("capitalTitle")}</span><span className="text-text">{t("capitalValue", { paid: short(d.paidUpCapitalPaise), auth: short(cap) })}</span>
          </figcaption>
          <div className="h-2 overflow-hidden rounded-full bg-surface-strong" role="img" aria-label={t("capitalValue", { paid: short(d.paidUpCapitalPaise), auth: short(cap) })}>
            <span className="block h-full origin-left animate-[cb-grow-x_0.7s_ease-out_both] rounded-full bg-primary" style={{ width: `${Math.max(2, share * 100)}%` }} />
          </div>
        </figure>
      ) : null}
      {d.chargesKnown !== false && d.charges.length ? (
        <figure className="space-y-1.5">
          <figcaption className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("chargesTitle")}</figcaption>
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-strong" role="img" aria-label={`${t("chargesOpen")}: ${short(open)}, ${t("chargesSatisfied")}: ${short(satisfied)}`}>
            <span className="h-full bg-warning-fg" style={{ width: `${(open / Math.max(1, open + satisfied)) * 100}%` }} />
            <span className="h-full bg-success-fg" style={{ width: `${(satisfied / Math.max(1, open + satisfied)) * 100}%` }} />
          </div>
          <Legend items={[["bg-warning-fg", `${t("chargesOpen")} ${short(open)}`], ["bg-success-fg", `${t("chargesSatisfied")} ${short(satisfied)}`]]} />
        </figure>
      ) : null}
    </div>
  );
}

/** How many other companies each director runs. */
export function DirectorsChart({ d }: { d: DirectorData }) {
  const t = useTranslations("report.chart");
  const max = Math.max(1, ...d.directors.map((x) => x.otherCompanies));
  if (!d.directors.length) return null;
  return (
    <figure className="space-y-1.5" role="img" aria-label={d.directors.map((x) => `${x.name}: ${x.otherCompanies}`).join(", ")}>
      <figcaption className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("directorsTitle")}</figcaption>
      {d.directors.map((x, i) => (
        <div key={x.din} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_1.5rem] items-center gap-2 text-xs">
          <span className="truncate text-text-2">{x.name}</span>
          <span className="h-2 overflow-hidden rounded-full bg-surface-strong">
            <span className={cn("block h-full origin-left animate-[cb-grow-x_0.6s_ease-out_both] rounded-full", x.disqualified ? "bg-danger-fg" : "bg-primary")} style={{ width: `${Math.max(x.otherCompanies ? 4 : 0, (x.otherCompanies / max) * 100)}%`, animationDelay: `${i * 70}ms` }} />
          </span>
          <span className="text-right font-medium tabular-nums">{x.otherCompanies}</span>
        </div>
      ))}
    </figure>
  );
}

/** The safe credit range on a line from zero to 2% of the base turnover. */
export function RangeBar({ lowPaise, highPaise, basePaise }: { lowPaise: number; highPaise: number; basePaise: number }) {
  const scale = Math.max(highPaise, basePaise * 0.02, 1);
  return (
    <div className="mt-3 space-y-1" aria-hidden="true">
      <div className="relative h-2 rounded-full bg-surface-strong">
        <span className="absolute inset-y-0 origin-left animate-[cb-grow-x_0.7s_ease-out_both] rounded-full bg-success-fg" style={{ left: `${(lowPaise / scale) * 100}%`, width: `${Math.max(2, ((highPaise - lowPaise) / scale) * 100)}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted"><span>₹0</span><span>{short(scale)}</span></div>
    </div>
  );
}

const SCALE = ["AAA", "AA", "A", "BBB", "BB", "B", "C", "D"];
/** Where each rating sits on the usual scale, from AAA (strongest) to D (default). "A-" and "A1+" count as A. */
export function RatingScale({ ratings }: { ratings: { agency: string; rating: string }[] }) {
  const t = useTranslations("report.chart");
  const step = (r: string) => {
    const base = r.toUpperCase().replace(/^(CARE|ICRA|CRISIL|IND|BWR|ACUITE)\s*/, "").match(/^(AAA|AA|A|BBB|BB|B|C|D)/)?.[1];
    return base ? SCALE.indexOf(base) : -1;
  };
  const placed = ratings.map((r) => ({ ...r, i: step(r.rating) })).filter((r) => r.i >= 0);
  if (!placed.length) return null;
  return (
    <figure className="mb-3 space-y-1.5" role="img" aria-label={placed.map((r) => `${r.agency} ${r.rating}`).join(", ")}>
      <figcaption className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("ratingTitle")}</figcaption>
      <div className="grid grid-cols-8 gap-1">
        {SCALE.map((s, i) => {
          const here = placed.filter((r) => r.i === i);
          return (
            <div key={s} className="flex flex-col items-center gap-1">
              <span className={cn("flex h-7 w-full items-center justify-center rounded-md text-[10px] font-semibold", here.length ? "bg-primary text-white" : i <= 3 ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg")}>{s}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted"><span>{t("ratingStrong")}</span><span>{t("ratingWeak")}</span></div>
    </figure>
  );
}
