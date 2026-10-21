import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Card, CardBody, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { maskMobile } from "@/lib/mask";
import { loadAccount } from "@/server/account";
import { ensureTestBusiness } from "@/server/dev/test-business";
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
      <span className="max-w-[140px] truncate font-head text-[15px] font-bold tracking-tight text-text sm:max-w-[240px] md:max-w-none">{active.name}</span>
      <span
        className={cn(
          "hidden shrink-0 items-center gap-1 rounded-lg border border-border bg-surface py-1 pl-1 pr-2 text-xs font-semibold leading-none text-text shadow-sm sm:inline-flex",
        )}
      >
        <span aria-hidden="true" className={cn("relative flex size-3 items-center justify-center", verified ? "text-success" : "text-warning")}>
          <span className="absolute inset-0 rounded-full bg-current opacity-25" />
          <span className="size-1.5 rounded-full bg-current" />
        </span>
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
  if (!ctx.orgId) {
    // Development: the hand-testing numbers get a ready, verified test business instead of sign-up.
    const test = await ensureTestBusiness(ctx.user);
    if (test === "ready") redirect("/dashboard");
    if (test === "stale") redirect("/api/v1/dev/fresh-sign-in");
    redirect("/signup/business");
  }
  const active = orgs.find((o) => o.id === ctx.orgId);
  if (active?.verification === "manual_review") {
    const t = await getTranslations("review");
    return (
      <Card className="mx-auto max-w-xl">
        <CardBody className="space-y-3 p-6">
          <Tag tone="warning">{t("tag")}</Tag>
          <h1 className="text-lg font-semibold text-text">{t("title", { organisation: active.name })}</h1>
          <p className="text-sm text-muted">{t("body")}</p>
        </CardBody>
      </Card>
    );
  }
  return <>{children}</>;
}
