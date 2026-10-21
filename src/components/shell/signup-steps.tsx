"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";

/**
 * Sign-up progress (S01 → S03): Mobile, Business, Profile, Plan. `current` is the 0-based step being shown.
 * Numbered circles joined by a line: done steps get a check, the current one the brand ring.
 */
export function SignupSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = useTranslations("signup");
  const steps = [t("stepMobile"), t("stepBusiness"), t("stepProfile"), t("stepPlan")];
  return (
    <nav aria-label={t("progress")}>
      <p className="sr-only">{t("stepOf", { current: current + 1, total: steps.length })}</p>
      <ol className="grid grid-cols-4">
        {steps.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={s} aria-current={now ? "step" : undefined} className="relative flex flex-col items-center gap-1.5 text-center">
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[13px] h-0.5 rounded-full transition-colors",
                    done ? "bg-brand" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                  done && "bg-brand text-white shadow-orange",
                  now && "bg-surface text-primary-text shadow-[0_0_0_2px_var(--primary),0_0_0_6px_var(--primary-soft)]",
                  !done && !now && "border border-border bg-surface text-subtle",
                )}
                aria-hidden="true"
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-[11.5px] font-semibold leading-tight", now ? "text-text" : done ? "text-text-2" : "text-subtle")}>
                {s}
                {done ? <span className="sr-only"> ({t("stepDone")})</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
