import clsx from "clsx";

type Flag = "green" | "amber" | "red";

const styles: Record<Flag, string> = {
  green: "bg-emerald-950/80 text-emerald-400 border-emerald-600/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
  amber: "bg-amber-950/80 text-amber-400 border-amber-600/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  red: "bg-rose-950/80 text-rose-400 border-rose-600/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]",
};

const dotColors: Record<Flag, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-rose-400 animate-pulse",
};

const labels: Record<Flag, string> = {
  green: "Safe to extend credit at standard terms",
  amber: "Caution: Reduced limit, shorter tenor required",
  red: "High Risk: Auto-approval blocked, manual review",
};

export function RiskFlagBadge({
  flag,
  size = "md",
  showLabel = false,
}: {
  flag: Flag;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider font-mono",
          styles[flag],
          size === "sm" && "px-2.5 py-0.5 text-xs",
          size === "md" && "px-3.5 py-1 text-xs",
          size === "lg" && "px-4 py-1.5 text-sm"
        )}
      >
        <span className={clsx("h-2 w-2 rounded-full", dotColors[flag])} />
        {flag}
      </span>
      {showLabel && (
        <span className="text-xs text-slate-400 font-normal font-sans">
          {labels[flag]}
        </span>
      )}
    </div>
  );
}

export function SignalBreakdownTable({
  signals,
}: {
  signals: {
    signal: string;
    source: string;
    weight: number;
    subScore: number;
    maxScore: number;
    effect: string;
    ruleId: string;
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-chaan-border bg-chaan-card">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-900/80 text-left uppercase text-slate-400 font-mono tracking-wider border-b border-chaan-border">
          <tr>
            <th className="px-4 py-3 font-semibold">Signal</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Weight</th>
            <th className="px-4 py-3 font-semibold">Sub-Score</th>
            <th className="px-4 py-3 font-semibold">Effect / Rationale</th>
            <th className="px-4 py-3 font-semibold">Rule ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {signals.map((s) => {
            const isHigh = s.subScore >= 70;
            const isLow = s.subScore <= 40;
            return (
              <tr key={s.ruleId} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-200">{s.signal}</td>
                <td className="px-4 py-3 text-slate-400">{s.source}</td>
                <td className="px-4 py-3 font-mono text-slate-300">{s.weight}%</td>
                <td className="px-4 py-3 font-mono font-bold">
                  <span
                    className={clsx(
                      "px-2 py-0.5 rounded text-[11px]",
                      isHigh
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50"
                        : isLow
                        ? "bg-rose-950/60 text-rose-400 border border-rose-800/50"
                        : "bg-amber-950/60 text-amber-400 border border-amber-800/50"
                    )}
                  >
                    {s.subScore}/{s.maxScore}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{s.effect}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{s.ruleId}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EscalationBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    L1: "bg-blue-950/70 text-blue-400 border-blue-800/60",
    L2: "bg-amber-950/70 text-amber-400 border-amber-800/60",
    L3: "bg-rose-950/70 text-rose-400 border-rose-800/60 font-bold",
  };
  return (
    <span
      className={clsx(
        "rounded px-2.5 py-0.5 text-xs font-mono border",
        colors[level] ?? "bg-slate-800 text-slate-300 border-slate-700"
      )}
    >
      {level}
    </span>
  );
}

export function SummaryCard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-chaan-border bg-chaan-card p-5 transition hover:border-slate-600 hover:bg-chaan-cardHover shadow-sm">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white font-mono">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block group">
        {inner}
      </a>
    );
  }
  return inner;
}
