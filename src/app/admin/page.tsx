import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LockKeyhole } from "lucide-react";
import { OpsConsole } from "@/components/admin/ops-console";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { ButtonLink, Card, CardBody } from "@/components/ui";
import { opsUser } from "@/server/ops";
import { opsOverview } from "@/server/ops-service";

// S21, first part (v4): data sources, MCA search copy, sample data mode and KYC per organisation. Prices, plans and
// staff sign-in come in Part 10. Only staff listed in OPS_MOBILES see anything.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S21.title") };
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Ops />
    </Suspense>
  );
}

async function Ops() {
  const t = await getTranslations("ops");
  const u = await opsUser();
  if (!u.ops) {
    return (
      <Card className="mx-auto mt-6 max-w-md">
        <CardBody className="flex flex-col items-center py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-soft text-primary-text" aria-hidden="true">
            <LockKeyhole size={22} />
          </span>
          <h1 className="mt-4 font-head text-xl font-extrabold text-text">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{u.signedIn ? t("notStaff") : t("signInFirst")}</p>
          {!u.signedIn ? (
            <ButtonLink href="/login?next=/admin" className="mt-5">
              {t("signIn")}
            </ButtonLink>
          ) : null}
        </CardBody>
      </Card>
    );
  }
  return <OpsConsole data={await opsOverview()} />;
}
