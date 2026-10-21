import Link from "next/link";
import { ArrowRight, IdCard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getContext } from "@/server/context";
import { kycStatus } from "@/server/kyc/service";

/** v4 11.2: a reminder for the Owner until KYC is done. It does not block the portal (to be confirmed, Q8). */
export async function KycBanner() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId || ctx.role !== "owner") return null;
  const kyc = await kycStatus(ctx.orgId);
  if (kyc.status === "verified") return null;
  const t = await getTranslations("kyc");
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-primary-line bg-soft px-3 py-2.5 text-sm shadow-sm sm:px-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-orange" aria-hidden="true">
        <IdCard size={17} />
      </span>
      <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-text-2">{t("banner")}</p>
      <Link
        href="/account/kyc"
        className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-[13px] font-bold text-primary-text shadow-sm transition-[border-color,scale] duration-150 hover:border-primary-line active:scale-[0.97]"
      >
        {t("bannerCta")}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
