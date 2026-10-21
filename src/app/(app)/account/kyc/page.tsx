import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { KycPanel } from "@/components/account/kyc-panel";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { getContext } from "@/server/context";
import { kycStatus } from "@/server/kyc/service";
import { gstCertificateStatus } from "@/server/kyc/gst-certificate";
import { can } from "@/lib/permissions";

// v4 11.2: KYC with DigiLocker for the person who signed up.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("kyc");
  return { title: t("title") };
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Kyc />
    </Suspense>
  );
}

async function Kyc() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null;
  const [kyc, cert] = await Promise.all([kycStatus(ctx.orgId), gstCertificateStatus(ctx.orgId)]);
  return <KycPanel kyc={kyc} cert={cert} canManage={can(ctx.role, "billing.manage")} />;
}
