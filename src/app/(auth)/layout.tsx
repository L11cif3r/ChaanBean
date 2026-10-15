import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shell/logo";

// Sign-in and sign-up (S01 to S03): a single centred column that works from 360 px.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("app");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface px-4 py-4 sm:px-6">
        <Logo href="/login" />
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        {children}
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted">{t("tagline")}</footer>
    </div>
  );
}
