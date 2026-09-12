import "@/app/globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/lib/i18n/context";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "ChaanBean — Credit Recovery & Verification",
  description: "B2B credit recovery and business verification platform for the Indian market",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const urlParams = new URLSearchParams(window.location.search);
                const urlTheme = urlParams.get("theme");
                if (urlTheme === "light" || urlTheme === "dark") {
                  localStorage.setItem("chaanbean_theme", urlTheme);
                }
                const saved = localStorage.getItem("chaanbean_theme");
                const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (saved === "dark" || (!saved && prefersDark)) {
                  document.documentElement.classList.remove("light");
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                  document.documentElement.classList.add("light");
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 antialiased font-sans">
        <LanguageProvider>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
