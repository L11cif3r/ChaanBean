import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link2Off } from "lucide-react";
import { Card, CardBody, Skeleton } from "@/components/ui";
import { ConsentFlow } from "@/components/consent/consent-flow";
import { getContext } from "@/server/context";
import { consentPage } from "@/server/consent/service";

// S10: the buyer opens the link from SMS, WhatsApp or email, sees who is asking and why, and says yes by OTP or no.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S10.title"), robots: { index: false, follow: false } };
}

async function Consent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getContext();
  const view = await consentPage(token, { requestId: ctx.requestId, ip: ctx.ip, userAgent: ctx.userAgent });
  if (!view) {
    const t = await getTranslations("consent");
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-soft text-primary-text" aria-hidden="true">
            <Link2Off size={22} />
          </span>
          <h1 className="mt-4 font-head text-lg font-bold text-text">{t("notFoundTitle")}</h1>
          <p className="mt-1 max-w-xs text-sm text-muted">{t("notFound")}</p>
        </CardBody>
      </Card>
    );
  }
  return <ConsentFlow token={token} initial={view} />;
}

export default function ConsentPage({ params }: PageProps<"/c/[token]">) {
  return (
    <Suspense fallback={<div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>}>
      <Consent params={params} />
    </Suspense>
  );
}
