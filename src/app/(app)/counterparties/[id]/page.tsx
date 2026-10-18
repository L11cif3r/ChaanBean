import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CounterpartyProfile } from "@/components/counterparties/counterparty-profile";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { caseChecksFor } from "@/server/cases/service";
import { reportsFor } from "@/server/checks/service";
import { counterpartyActivity, getCounterparty } from "@/server/counterparties/service";
import { AppError } from "@/server/errors";

// S07: the counterparty's 360 view (FR-CP-06).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S07.title") };
}

export default function Page({ params }: PageProps<"/counterparties/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Profile params={params} />
    </Suspense>
  );
}

async function Profile({ params }: { params: PageProps<"/counterparties/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null; // OrgGate in the layout redirects
  const c = { ...ctx, user: ctx.user, orgId: ctx.orgId };
  const loaded = await Promise.all([getCounterparty(c, id), counterpartyActivity(c, id), reportsFor(c, id), caseChecksFor(c, id)]).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const [profile, activity, reports, cases] = loaded;
  return (
    <CounterpartyProfile
      profile={profile}
      activity={activity}
      reports={reports}
      cases={cases}
      canManage={can(ctx.role, "counterparty.manage")}
      canRun={can(ctx.role, "check.run")}
    />
  );
}
