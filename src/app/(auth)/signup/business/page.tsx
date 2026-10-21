import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getContext } from "@/server/context";
import { ensureTestBusiness, isHandTestingNumber } from "@/server/dev/test-business";
import { BusinessWizard } from "./business-wizard";

// S02: verify the business behind a new account and create the organisation.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S02.title") };
}

export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={null}>
        <TestNumberShortcut />
      </Suspense>
      <BusinessWizard />
    </div>
  );
}

/** Development: a hand-testing number never sees business sign-up; it gets a ready, verified test business. */
async function TestNumberShortcut() {
  const ctx = await getContext();
  if (!ctx.user) return null;
  if (ctx.orgId) {
    if (isHandTestingNumber(ctx.user.phone)) redirect("/dashboard");
    return null;
  }
  const test = await ensureTestBusiness(ctx.user);
  if (test === "ready") redirect("/dashboard");
  if (test === "stale") redirect("/api/v1/dev/fresh-sign-in");
  return null;
}
