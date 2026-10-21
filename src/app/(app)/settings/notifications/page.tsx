import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BellRing, FileCheck2, Handshake, Wallet } from "lucide-react";
import { ButtonLink, Card, CardBody, GradientText, PageHeader, SectionLabel, Tag, Toggle } from "@/components/ui";
import { screen } from "@/lib/screens";

// S20: built in Part 6 (docs/PARTS.md). Until then the page shows what is coming, with a faded, inactive preview of
// the grouped switches (one line per event, one switch per channel).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S20.title") };
}

const CHANNELS = ["sms", "email", "whatsapp"] as const;

const GROUPS = [
  { key: "checks", icon: FileCheck2, events: ["reportReady", "consentAnswer"] },
  { key: "agreements", icon: Handshake, events: ["accepted", "dueSoon", "overdue"] },
  { key: "wallet", icon: Wallet, events: ["lowBalance", "invoiceReady"] },
] as const;

export default async function Page() {
  const t = await getTranslations();
  const n = await getTranslations("settings.notifications");
  const s = screen("S20");
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={n("eyebrow")}
        title={<>{n("titleLead")} <GradientText>{n("titleAccent")}</GradientText></>}
        description={n("description")}
      />

      <Card>
        <CardBody className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-orange" aria-hidden="true">
            <BellRing size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag tone="info">{t("placeholder.badge", { part: s.part })}</Tag>
              <Tag>{t("placeholder.screen", { id: "S20" })}</Tag>
            </div>
            <p className="mt-2 text-sm text-muted">{n("comingBody")}</p>
            <ButtonLink href="/dashboard" variant="secondary" size="sm" className="mt-3">
              {t("placeholder.backToDashboard")}
            </ButtonLink>
          </div>
        </CardBody>
      </Card>

      {/* Preview only: inactive and hidden from assistive technology until Part 6 makes it work. */}
      <div aria-hidden="true" inert className="pointer-events-none select-none space-y-3 opacity-60 saturate-[0.6] [mask-image:linear-gradient(180deg,#000_55%,transparent)]">
        {GROUPS.map(({ key, icon: Icon, events }) => (
          <Card key={key}>
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <span className="inline-flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-soft text-primary-text">
                  <Icon size={15} />
                </span>
                <span className="font-head text-[15px] font-bold text-text">{n(`groups.${key}`)}</span>
              </span>
              <span className="hidden gap-6 sm:flex">
                {CHANNELS.map((c) => (
                  <SectionLabel key={c} className="w-14 text-center">
                    {n(`channels.${c}`)}
                  </SectionLabel>
                ))}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {events.map((e, i) => (
                <li key={e} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <span className="text-sm font-medium text-text">{n(`events.${e}`)}</span>
                  <span className="flex gap-4 sm:gap-6">
                    {CHANNELS.map((c, j) => (
                      <span key={c} className="flex items-center gap-2 sm:w-14 sm:justify-center">
                        <Toggle id={`preview-${key}-${e}-${c}`} label="" defaultChecked={(i + j) % 3 !== 2} tabIndex={-1} />
                        <span className="text-xs text-muted sm:hidden">{n(`channels.${c}`)}</span>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
