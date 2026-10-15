import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shell/logo";
import { ThemeSwitch } from "@/components/shell/theme-switch";

// Sign-in and sign-up (S01 to S03), styled as the redesigned site: a sticky bar with the brand and theme switch over a
// soft orange wash with a dot grid. Pages choose their own width; everything works from 360 px.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("app");
  return (
    <div className="site relative isolate flex min-h-dvh flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[linear-gradient(180deg,rgba(255,128,40,0.12),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,82,0,0.16),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(var(--dot)_1.2px,transparent_1.2px)] bg-[length:24px_24px] [mask-image:linear-gradient(180deg,#000,transparent)]"
        aria-hidden="true"
      />
      <header className="sticky top-0 z-40 bg-[var(--nav-bg)] shadow-[0_1px_0_var(--border)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-[66px] w-full max-w-[1200px] items-center justify-between gap-3 px-5 md:h-[72px] md:px-8">
          <Logo href="/login" />
          <ThemeSwitch />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-5 md:px-8 lg:py-9">
        {children}
      </main>
      <footer className="px-4 py-6 text-center text-xs font-medium text-subtle">{t("tagline")}</footer>
    </div>
  );
}
