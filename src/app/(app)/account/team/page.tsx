import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, EmptyState } from "@/components/ui";
import { can } from "@/lib/permissions";
import { getContext } from "@/server/context";
import { listTeam } from "@/server/team/service";
import { TeamManager } from "./team-manager";

// S18: manage who in the organisation can use Chaanbean and what they can do (Owner and Admin).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S18.title") };
}

export default async function TeamPage() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId || !can(ctx.role, "team.manage")) {
    const t = await getTranslations("team");
    return (
      <Card>
        <EmptyState title={t("noAccessTitle")} body={t("noAccessBody")} />
      </Card>
    );
  }
  const team = await listTeam({ ...ctx, user: ctx.user, orgId: ctx.orgId, role: ctx.role! });
  return <TeamManager initial={team} />;
}
