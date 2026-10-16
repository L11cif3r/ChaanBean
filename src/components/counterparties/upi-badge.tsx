"use client";

import { useTranslations } from "next-intl";
import { Tag, type Tone } from "@/components/ui";
import type { UpiStatus } from "@/lib/counterparties";

// State of the bank-linked mobile check (PRD S06 marker 4) as a chip.

const TONE: Record<UpiStatus, Tone> = {
  linked: "success",
  manual_confirmed: "success",
  not_linked: "danger",
  unavailable: "warning",
  not_checked: "neutral",
};

export function UpiBadge({ status }: { status: UpiStatus; compact?: boolean }) {
  const t = useTranslations("counterparties");
  return <Tag tone={TONE[status]}>{t(`upiShort.${status}`)}</Tag>;
}
