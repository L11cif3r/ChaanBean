import { getTranslations } from "next-intl/server";
import { ButtonLink, Card, CardBody, PageHeader, Tag } from "@/components/ui";
import { screen, type ScreenId } from "@/lib/screens";

/** Stand-in for a screen that a later part builds. Shows what the screen is for and when it arrives. */
export async function PlaceholderPage({ id, showBack = true }: { id: ScreenId; showBack?: boolean }) {
  const t = await getTranslations();
  const s = screen(id);
  return (
    <div className="space-y-6">
      <PageHeader title={t(`screens.${id}.title`)} description={t(`screens.${id}.purpose`)} />
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="info">{t("placeholder.badge", { part: s.part })}</Tag>
            <Tag>{t("placeholder.screen", { id })}</Tag>
          </div>
          <p className="max-w-2xl text-sm text-muted">{t("placeholder.body", { part: s.part })}</p>
          {showBack ? (
            <ButtonLink href="/dashboard" variant="secondary" size="sm">
              {t("placeholder.backToDashboard")}
            </ButtonLink>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
