import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Card, CardBody, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
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

/** Organisation name and verification chip on the left of the top bar (as on the redesigned portal). */
export async function OrgBadge() {
  const { ctx, orgs } = await loadAccount();
  const active = orgs.find((o) => o.id === ctx.orgId);
  if (!active) return null;
  const t = await getTranslations("topbar");
  const verified = active.verification === "gstin_verified" || active.verification === "pan_verified";
  return (
    <>
      <span className="max-w-[140px] truncate text-sm font-bold tracking-tight text-text sm:max-w-[240px] sm:text-base md:max-w-none">{active.name}</span>
      <span
        className={cn(
          "hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold sm:inline-flex",
          verified ? "border-success-fg/30 bg-success-bg text-success-fg" : "border-warning-fg/30 bg-warning-bg text-warning-fg",
        )}
      >
        <ShieldCheck size={13} aria-hidden="true" />
        {verified ? t("verified") : t("pendingVerification")}
      </span>
    </>
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
