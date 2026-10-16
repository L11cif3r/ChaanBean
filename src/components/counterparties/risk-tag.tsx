"use client";

import { useTranslations } from "next-intl";
import { Tag, type Tone } from "@/components/ui";

// Risk level from the latest credit report (PRD v2.0 section 6) as a chip; "Not checked" before the first report.

type Risk = "high" | "medium" | "low" | "not_enough_data";
const TONE: Record<Risk, Tone> = { high: "danger", medium: "warning", low: "success", not_enough_data: "neutral" };

export function RiskTag({ risk }: { risk: Risk | null }) {
  const t = useTranslations("counterparties");
  if (!risk) return <Tag tone="neutral">{t("riskNotChecked")}</Tag>;
  return <Tag tone={TONE[risk]}>{t(`risk.${risk}`)}</Tag>;
}
