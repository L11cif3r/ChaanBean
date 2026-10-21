import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { ThemeSwitch } from "@/components/shell/theme-switch";

// Pages a counterparty opens from SMS, email or WhatsApp (S10, S15, S22). Designed for phones first; no sign-in.
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("app");
  return (
    <div className="site flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-[var(--nav-bg)] px-4 shadow-[0_1px_0_var(--border)] backdrop-blur-xl">
        <div className="mx-auto flex h-[66px] max-w-lg items-center justify-between gap-3">
          <Logo href={null} />
          <ThemeSwitch />
        </div>
      </header>
      <main id="main" className="mx-auto w-full min-w-0 max-w-lg flex-1 px-4 py-5 sm:py-8">
        {children}
      </main>
      <footer className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <p className="mx-auto flex max-w-lg items-center justify-center gap-1.5 text-center text-xs text-muted">
          <ShieldCheck size={13} className="shrink-0 text-success-fg" aria-hidden="true" /> {t("securedBy")}
        </p>
      </footer>
    </div>
  );
}
