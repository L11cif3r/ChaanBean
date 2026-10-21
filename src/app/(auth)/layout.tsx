import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shell/logo";
import { ThemeSwitch } from "@/components/shell/theme-switch";

// Sign-in and sign-up (S01 to S03): a sticky bar with the brand and theme switch over a soft brand wash with a faint
// dot grid. Pages choose their own width; everything works from 360 px.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("login");
  return (
    <div className="site relative isolate flex min-h-dvh flex-col bg-bg">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden" aria-hidden="true">
        <span className="absolute inset-0 bg-soft [mask-image:linear-gradient(180deg,#000_30%,transparent)]" />
        <span className="absolute inset-0 bg-[radial-gradient(var(--dot)_1.2px,transparent_1.2px)] bg-[length:24px_24px] [mask-image:linear-gradient(180deg,#000,transparent)]" />
      </div>
      <header className="sticky top-0 z-40 bg-[var(--nav-bg)] shadow-[0_1px_0_var(--border)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-5 md:px-8">
          <Logo href="/login" taglineClassName="hidden sm:block" />
          <ThemeSwitch />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 sm:px-5 md:px-8 lg:py-8">
        {children}
      </main>
      <footer className="px-4 py-5 text-center text-[11.5px] font-medium text-subtle">{t("footer")}</footer>
    </div>
  );
}
