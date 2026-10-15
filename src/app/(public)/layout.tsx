import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shell/logo";

// Pages a counterparty opens from SMS, email or WhatsApp (S10, S15, S22). Designed for phones first; no sign-in.
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("app");
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="bg-sidebar px-4 py-3.5">
        <div className="mx-auto max-w-lg">
          <Logo tone="light" href={null} />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted">{t("securedBy")}</footer>
    </div>
  );
}
