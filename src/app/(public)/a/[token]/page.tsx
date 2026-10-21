import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link2Off } from "lucide-react";
import { AgreementFlow } from "@/components/agreement/agreement-flow";
import { Card, CardBody, Skeleton } from "@/components/ui";
import { getContext } from "@/server/context";
import { agreementPage } from "@/server/transactions/public";

// S15 (PRD v3.0 Figure 21): the counterparty reviews the agreement on a phone and accepts by OTP, asks for changes or
// rejects. No account needed.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S15.title"), robots: { index: false, follow: false } };
}

async function Agreement({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getContext();
  const view = await agreementPage(token, { requestId: ctx.requestId, ip: ctx.ip, userAgent: ctx.userAgent });
  if (!view) {
    const t = await getTranslations("agreement");
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-soft text-primary-text" aria-hidden="true"><Link2Off size={20} /></span>
          <h1 className="mt-2 text-lg font-bold text-text">{t("notFoundTitle")}</h1>
          <p className="max-w-xs text-sm text-muted">{t("notFound")}</p>
        </CardBody>
      </Card>
    );
  }
  return <AgreementFlow token={token} initial={view} />;
}

export default function Page({ params }: PageProps<"/a/[token]">) {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-72 w-full rounded-2xl" /><Skeleton className="h-40 w-full rounded-2xl" /></div>}>
      <Agreement params={params} />
    </Suspense>
  );
}
