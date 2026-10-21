"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { formatInrShort } from "@/lib/money";
import { turnoverSeries, yoyChange, type TurnoverData } from "@/lib/checks";
import { projectFullYear } from "@/lib/example-report";

// PRD v4.0 FR-RP-01 to 03: GST turnover as a chart. Bar by financial year (default) with values and year-on-year
// change; Line; Pie (each year's share of the total, with "Pie shows share, not trend"); and the current year by month.
// A part-filed year also shows a hatched run-rate projection on top: the full year at the pace of the months filed.

type View = "bar" | "line" | "pie" | "month";
const short = (p: number) => formatInrShort(BigInt(Math.round(p)));
const SLICES = ["#ff5200", "#fc8019", "#ffa24a", "#ffc58f", "#ffe0c2"];

export function TurnoverChart({ d }: { d: TurnoverData }) {
  const t = useTranslations("report.chart");
  const { years, current } = turnoverSeries(d);
  const views: View[] = years.length > 1 ? ["bar", "line", "pie", ...(current?.months.length ? (["month"] as View[]) : [])] : ["bar", ...(current?.months.length ? (["month"] as View[]) : [])];
  const [view, setView] = useState<View>(views[0]);

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={t("label")} className="inline-flex rounded-lg bg-surface-strong p-0.5">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn("h-7 rounded-md px-2.5 text-xs font-medium transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[0.97]", view === v ? "bg-surface text-text shadow-control" : "text-muted hover:text-text")}
          >
            {t(`view.${v}`)}
          </button>
        ))}
      </div>
      {view === "bar" ? <Bars points={years.map((y) => ({ label: y.label, value: y.turnoverPaise, partial: y.partial, projected: projectFullYear(y) }))} showChange /> : null}
      {view === "bar" ? <p className="text-center text-[11px] text-subtle">{t("fyAxis")}</p> : null}
      {view === "bar" && years.some((y) => projectFullYear(y)) ? (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
          <span className="inline-block h-2.5 w-3.5 rounded-sm border border-primary/50 bg-[repeating-linear-gradient(135deg,var(--primary-line)_0_3px,transparent_3px_6px)]" aria-hidden="true" />
          {t("projectedNote")}
        </p>
      ) : null}
      {view === "line" ? <Line points={years.map((y) => ({ label: y.label, value: y.turnoverPaise }))} /> : null}
      {view === "pie" ? <Pie points={years.filter((y) => !y.partial).map((y) => ({ label: y.label, value: y.turnoverPaise }))} note={t("pieNote")} /> : null}
      {view === "month" && current ? <Bars points={current.months.map((m) => ({ label: m.label, value: m.turnoverPaise }))} compact /> : null}
    </div>
  );
}

function Bars({ points, showChange, compact }: { points: { label: string; value: number; partial?: boolean; projected?: number | null }[]; showChange?: boolean; compact?: boolean }) {
  const t = useTranslations("report.chart");
  const max = Math.max(1, ...points.map((p) => Math.max(p.value, p.projected ?? 0)));
  const scale = compact ? 150 : 140;
  return (
    <div className={cn("flex items-end", compact ? "h-48 gap-1.5" : "h-56 gap-3")} role="img" aria-label={points.map((p) => `${p.label}: ${short(p.value)}${p.projected ? ` (${t("projectedShort", { value: short(p.projected) })})` : ""}`).join(", ")}>
      {points.map((p, i) => {
        const change = showChange && i > 0 && !p.partial ? yoyChange(points[i - 1].value, p.value) : null;
        const extra = p.projected ? Math.max(0, p.projected - p.value) : 0;
        return (
          <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            {change !== null ? (
              <span className={cn("text-[11px] font-medium tabular-nums", change >= 0 ? "text-success-fg" : "text-danger-fg")}>{change >= 0 ? "▲" : "▼"} {Math.abs(change)}%</span>
            ) : p.projected ? (
              <span className="text-[10.5px] font-medium tabular-nums text-primary-text" title={t("projectedShort", { value: short(p.projected) })}>≈ {short(p.projected)}</span>
            ) : <span className="h-[15px]" />}
            {!compact ? <span className="text-xs font-semibold tabular-nums text-text">{short(p.value)}</span> : null}
            <div className="flex w-full flex-col">
              {extra ? (
                <div
                  title={t("projectedShort", { value: short(p.projected!) })}
                  className="w-full origin-bottom animate-[cb-grow_0.7s_cubic-bezier(0.2,0.7,0.2,1)_both] rounded-t-md border border-b-0 border-dashed border-primary/60 bg-[repeating-linear-gradient(135deg,var(--primary-line)_0_3px,transparent_3px_7px)]"
                  style={{ height: `${(extra / max) * scale}px`, animationDelay: `${i * 60 + 300}ms` }}
                />
              ) : null}
              <div
                title={`${p.label}: ${short(p.value)}`}
                className={cn("w-full origin-bottom animate-[cb-grow_0.7s_cubic-bezier(0.2,0.7,0.2,1)_both]", extra ? "" : "rounded-t-md", p.partial ? "bg-primary/55" : "bg-primary")}
                style={{ height: `${Math.max(4, (p.value / max) * scale)}px`, animationDelay: `${i * 60}ms` }}
              />
            </div>
            {/* "FY 2024-25" is shortened to "24-25" so five years fit side by side on a phone; the caption says "Financial year". */}
            <span className={cn("text-center leading-tight text-muted", compact ? "text-[10px]" : "text-[11px]")} title={p.partial ? t("soFar", { label: p.label }) : p.label}>
              {p.label.replace(/^FY 20/, "")}
              {p.partial ? <span className="block text-[9px]">{t("soFarShort")}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Line({ points }: { points: { label: string; value: number }[] }) {
  const W = 560;
  const H = 200;
  const pad = 36;
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - 28 - (v / max) * (H - 60);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label={points.map((p) => `${p.label}: ${short(p.value)}`).join(", ")}>
      <path d={`${path} L${x(points.length - 1)},${H - 28} L${x(0)},${H - 28} Z`} fill="var(--primary)" opacity="0.08" />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="animate-[cb-draw_1s_ease-out_both]" />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={x(i)} cy={y(p.value)} r="5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
          <text x={x(i)} y={y(p.value) - 12} textAnchor="middle" className="fill-[var(--text)] text-[12px] font-semibold">{short(p.value)}</text>
          <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-[var(--text-muted)] text-[11px]">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Pie({ points, note }: { points: { label: string; value: number }[]; note: string }) {
  const total = points.reduce((s, p) => s + p.value, 0) || 1;
  const R = 80;
  const before = (i: number) => points.slice(0, i).reduce((s, p) => s + p.value, 0);
  const arcs = points.map((p, i) => {
    const a0 = -Math.PI / 2 + (before(i) / total) * Math.PI * 2;
    const a1 = a0 + (p.value / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M100,100 L${100 + R * Math.cos(a0)},${100 + R * Math.sin(a0)} A${R},${R} 0 ${large} 1 ${100 + R * Math.cos(a1)},${100 + R * Math.sin(a1)} Z`;
    return { ...p, d, color: SLICES[i % SLICES.length], share: Math.round((p.value / total) * 100) };
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <svg viewBox="0 0 200 200" className="h-48 w-48 shrink-0 animate-[cb-pop_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both]" role="img" aria-label={arcs.map((a) => `${a.label}: ${a.share}%`).join(", ")}>
          {arcs.map((a) => <path key={a.label} d={a.d} fill={a.color} stroke="var(--surface)" strokeWidth="2" />)}
          <circle cx="100" cy="100" r="44" fill="var(--surface)" />
        </svg>
        <ul className="w-full space-y-1.5 text-sm">
          {arcs.map((a) => (
            <li key={a.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: a.color }} aria-hidden="true" />{a.label}</span>
              <span className="tabular-nums text-text-2">{short(a.value)} · <span className="font-semibold text-text">{a.share}%</span></span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted">{note}</p>
    </div>
  );
}
