"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";

/** Sign-up progress (S01 → S03): Mobile, Business, Profile, Plan. `current` is the 0-based step being shown. */
export function SignupSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = useTranslations("signup");
  const steps = [t("stepMobile"), t("stepBusiness"), t("stepProfile"), t("stepPlan")];
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium" aria-label={t("progress")}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                done ? "bg-brand border-transparent text-white" : active ? "border-primary text-primary-text" : "border-border text-muted",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={active ? "text-text" : "text-muted"}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
