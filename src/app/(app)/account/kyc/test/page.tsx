import { Suspense } from "react";
import { KycTestConsent } from "@/components/account/kyc-panel";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { notFound } from "next/navigation";
import { MOCK, primary } from "@/server/providers/registry";

// The test stand-in for DigiLocker's consent page. Only while the KYC provider is the dummy.
export default function Page({ searchParams }: PageProps<"/account/kyc/test">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Test searchParams={searchParams} />
    </Suspense>
  );
}

async function Test({ searchParams }: { searchParams: PageProps<"/account/kyc/test">["searchParams"] }) {
  if (primary("kyc") !== MOCK) notFound();
  const { state } = await searchParams;
  if (typeof state !== "string") notFound();
  return <KycTestConsent state={state} />;
}
