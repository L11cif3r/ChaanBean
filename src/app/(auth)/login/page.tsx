import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeftRight, Handshake, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";

// S01: sign in or start sign-up with a mobile number and a one-time password.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S01.title") };
}

const MODULES = [
  { key: "creditCheck", icon: ShieldCheck },
  { key: "caseCheck", icon: Scale },
  { key: "transactions", icon: ArrowLeftRight },
  { key: "settlements", icon: Handshake },
] as const;

export default async function LoginPage() {
  const t = await getTranslations("login");
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-8">
      {/* Brand panel: beside the form on desktop, below it on phones (as on the redesigned site). */}
      <aside
        aria-label={t("asideLabel")}
        className="bg-brand relative isolate order-2 flex flex-col gap-[26px] overflow-hidden rounded-[28px] px-[22px] py-7 text-white shadow-[0_30px_60px_-34px_rgba(255,82,0,0.75)] sm:px-9 sm:py-10 lg:order-none lg:px-11 lg:pb-10 lg:pt-11 dark:bg-[linear-gradient(160deg,#2a1206_0%,#0b0b0b_55%)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      >
        <span
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.16)_1.2px,transparent_1.2px)] bg-[length:22px_22px] [mask-image:linear-gradient(200deg,#000_0%,transparent_60%)]"
          aria-hidden="true"
        />
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-[13px] py-1.5 text-[0.78rem] font-bold">
            <Sparkles size={14} aria-hidden="true" /> {t("asideChip")}
          </span>
          <p className="mt-[18px] text-[clamp(1.75rem,1.15rem+2.1vw,2.75rem)] font-extrabold leading-[1.22] tracking-[-0.032em] [text-wrap:balance]">
            {t.rich("asideTitle", {
              accent: (chunks) => <span className="text-[#1f0c00] dark:text-[#ff7a1f]">{chunks}</span>,
            })}
          </p>
          <p className="mt-3.5 max-w-[470px] text-[1.02rem] leading-relaxed text-white/90">{t("asideLead")}</p>
        </div>
        <div className="rounded-[20px] border border-white/25 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
          <span className="mb-2.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-white/85">{t("loginFor")}</span>
          <ul className="grid grid-cols-2 gap-2">
            {MODULES.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="flex min-w-0 items-center gap-2.5 rounded-[14px] bg-white/15 px-2.5 py-2 text-[0.88rem] font-bold leading-tight dark:bg-white/5"
              >
                <span
                  className="dark:bg-brand inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] bg-white text-[#e64a00] dark:text-white"
                  aria-hidden="true"
                >
                  <Icon size={16} />
                </span>
                {t(`modules.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="min-w-0">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
