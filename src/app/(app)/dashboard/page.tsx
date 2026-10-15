import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardBody, CardHeader, PageHeader, Tag } from "@/components/ui";
import { loadAccount } from "@/server/account";

// S04 for a new organisation: the guided checklist (PRD S04 "New organisation"). Part 10 adds the summary cards,
// attention list, plan usage and activity.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S04.title") };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const { ctx, profile, orgs } = await loadAccount();
  const org = orgs.find((o) => o.id === ctx.orgId);
  const firstName = profile?.fullName.split(" ")[0];
  const canAct = ctx.role !== "viewer";

  const steps = [
    { key: "counterparty", href: "/counterparties/new", show: canAct },
    { key: "check", href: "/checks/new", show: canAct },
    { key: "teammate", href: "/account/team", show: ctx.role === "owner" || ctx.role === "admin" },
    { key: "transaction", href: "/transactions/new", show: canAct },
  ].filter((s) => s.show);

  return (
    <div className="space-y-6">
      <PageHeader title={firstName ? t("greeting", { name: firstName }) : t("greetingNoName")} description={org ? t("subtitle", { organisation: org.name }) : undefined} />
      {org?.verification === "unverified" ? (
        <p role="status" className="rounded-lg bg-info-bg px-4 py-3 text-sm text-info-fg">
          {t("verificationPending")}
        </p>
      ) : null}
      {steps.length ? (
        <Card>
          <CardHeader title={t("checklistTitle")} action={<Tag tone="info">{t("gettingStarted")}</Tag>} />
          <CardBody>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={s.key} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs font-semibold text-muted">
                    {i + 1}
                  </span>
                  <div>
                    <Link href={s.href} className="text-sm font-semibold text-primary hover:underline">
                      {t(`steps.${s.key}.title`)}
                    </Link>
                    <p className="text-xs text-muted">{t(`steps.${s.key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
