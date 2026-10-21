import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui";
import { VerifyDocument } from "@/components/verify/verify-document";

// S22 (PRD v3.0 8.5 step 6): anyone can check that a sealed ChaanBean agreement has not been changed.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S22.title") };
}

async function Verify({ params }: { params: PageProps<"/v/[reference]">["params"] }) {
  const { reference } = await params;
  return <VerifyDocument initialReference={decodeURIComponent(reference).toUpperCase().slice(0, 20)} />;
}

export default function Page({ params }: PageProps<"/v/[reference]">) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
      <Verify params={params} />
    </Suspense>
  );
}
