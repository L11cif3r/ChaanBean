import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Card, CardBody, Tag } from "@/components/ui";
import { maskMobile } from "@/lib/mask";
import { loadAccount } from "@/server/account";
import { AccountMenu } from "./account-menu";

/** Top-bar account area. Rendered inside Suspense because it reads the session (Cache Components). */
export async function AccountArea() {
  const { ctx, profile, orgs } = await loadAccount();
  if (!ctx.user) return null;
  return (
    <AccountMenu
      name={profile?.fullName ?? ""}
      phone={ctx.user.phone ? `+91 ${maskMobile(ctx.user.phone)}` : ""}
      orgs={orgs.map((o) => ({ id: o.id, name: o.name, role: o.role }))}
      activeOrgId={ctx.orgId}
    />
  );
}

/**
 * Gate in front of every signed-in page: no session → sign-in, no organisation → business verification (S02), and an
 * organisation under manual review sees only the review notice (S02: "sign-up allowed only after manual review").
 */
export async function OrgGate({ children }: { children: ReactNode }) {
  const { ctx, orgs } = await loadAccount();
  if (!ctx.user) redirect("/login");
  if (!ctx.orgId) redirect("/signup/business");
  const active = orgs.find((o) => o.id === ctx.orgId);
  if (active?.verification === "manual_review") {
    const t = await getTranslations("review");
    return (
      <Card className="mx-auto max-w-xl">
        <CardBody className="space-y-3 p-6">
          <Tag tone="warning">{t("tag")}</Tag>
          <h1 className="text-lg font-bold text-text">{t("title", { organisation: active.name })}</h1>
          <p className="text-sm text-muted">{t("body")}</p>
        </CardBody>
      </Card>
    );
  }
  return <>{children}</>;
}
