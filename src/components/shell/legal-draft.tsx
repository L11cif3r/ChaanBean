import { getTranslations } from "next-intl/server";
import { Card, CardBody, Tag } from "@/components/ui";

/** Placeholder legal text until Chaanbean's counsel supplies the approved documents (PRD 3.4, A8). */
export async function LegalDraft({ kind }: { kind: "terms" | "privacy" }) {
  const t = await getTranslations("legal");
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold text-text">{t(`${kind}.title`)}</h1>
          <Tag tone="warning">{t("draftTag")}</Tag>
        </div>
        <p className="text-sm text-muted">{t("draftBody", { version: "v0.1-draft" })}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text">
          {(t.raw(`${kind}.sections`) as string[]).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
