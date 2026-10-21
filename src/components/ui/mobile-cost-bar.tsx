"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./button";

// PRD v4.0 C16: on phones the cost and the next step stay at the bottom of the screen while the user ticks checks.
// Hidden from the large layout, where the cost card sits beside the checks.

export function MobileCostBar({ total, count, label, disabled, loading, onClick }: {
  total: ReactNode; count: number; label: ReactNode; disabled?: boolean; loading?: boolean; onClick: () => void;
}) {
  const t = useTranslations("ui.costBar");
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-[var(--nav-bg)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-16px_rgba(16,24,40,0.3)] backdrop-blur lg:hidden">
      <div className="min-w-0">
        <p className="text-xs text-muted">{t("checks", { count })}</p>
        <p className="font-head text-xl font-extrabold tabular-nums text-gradient">{total}</p>
      </div>
      <Button className="h-12 min-w-[9rem] rounded-2xl text-[15px]" disabled={disabled} loading={loading} onClick={onClick}>{label}</Button>
    </div>
  );
}
