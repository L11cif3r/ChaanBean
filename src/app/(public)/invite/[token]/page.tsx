import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowRight, MailX, UsersRound } from "lucide-react";
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
      <Card className="animate-rise">
        <CardBody className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-soft text-primary-text" aria-hidden="true">
            <MailX size={20} />
          </span>
          <h1 className="mt-4 font-head text-lg font-bold text-text">{t("unavailableTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t(invite?.status === "accepted" ? "alreadyAccepted" : invite?.expired ? "expired" : "notFound")}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="animate-rise overflow-hidden">
      <div className="relative isolate px-5 pb-5 pt-7 text-center">
        <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
        <span
          className="pointer-events-none absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.25),transparent_65%)] blur-2xl"
          aria-hidden="true"
        />
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand text-white shadow-orange" aria-hidden="true">
          <UsersRound size={22} />
        </span>
        <p className="mt-4 text-[11px] font-semibold uppercase leading-none tracking-[1.2px] text-subtle">{t("eyebrow")}</p>
        <h1 className="mt-2 font-head text-[1.45rem] font-extrabold leading-tight tracking-[-0.02em] text-text [text-wrap:balance]">
          {t.rich("titleRich", { organisation: invite.legal_name, accent: (c) => <span className="text-gradient">{c}</span> })}
        </h1>
        <p className="mt-1.5 text-sm text-muted">{t("body", { inviter: invite.inviter ?? t("someone"), name: invite.full_name })}</p>
        <div className="mt-3.5 flex flex-wrap justify-center gap-2">
          <Tag tone="info">{t(`roles.${invite.role}`)}</Tag>
          <Tag>{t("forMobile", { mobile: invite.mobile_masked })}</Tag>
        </div>
      </div>
      <CardBody className="border-t border-border">
        {ctx.user ? (
          <AcceptInvite token={token} />
        ) : (
          <ButtonLink href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="w-full">
            {t("signInToAccept")}
            <ArrowRight size={16} aria-hidden="true" />
          </ButtonLink>
        )}
      </CardBody>
    </Card>
  );
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full rounded-2xl" />}>
      <Invite params={params} />
    </Suspense>
  );
}
