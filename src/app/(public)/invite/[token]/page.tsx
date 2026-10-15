import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ButtonLink, Card, CardBody, Skeleton, Tag } from "@/components/ui";
import { getContext } from "@/server/context";
import { inviteByToken } from "@/server/team/service";
import { AcceptInvite } from "./accept-invite";

// Invitation link from S18: shows who invited the person and lets them accept after signing in with the invited mobile.
export const metadata: Metadata = { title: "Invitation" };

async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("invite");
  const [invite, ctx] = await Promise.all([inviteByToken(token), getContext()]);

  if (!invite || invite.status !== "pending" || invite.expired) {
    return (
      <Card>
        <CardBody className="space-y-2">
          <h1 className="text-lg font-bold text-text">{t("unavailableTitle")}</h1>
          <p className="text-sm text-muted">{t(invite?.status === "accepted" ? "alreadyAccepted" : invite?.expired ? "expired" : "notFound")}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("eyebrow")}</p>
          <h1 className="text-lg font-bold text-text">{t("title", { organisation: invite.legal_name })}</h1>
          <p className="text-sm text-muted">{t("body", { inviter: invite.inviter ?? t("someone"), name: invite.full_name })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag tone="info">{t(`roles.${invite.role}`)}</Tag>
          <Tag>{t("forMobile", { mobile: invite.mobile_masked })}</Tag>
        </div>
        {ctx.user ? (
          <AcceptInvite token={token} />
        ) : (
          <ButtonLink href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="w-full">
            {t("signInToAccept")}
          </ButtonLink>
        )}
      </CardBody>
    </Card>
  );
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <Invite params={params} />
    </Suspense>
  );
}
