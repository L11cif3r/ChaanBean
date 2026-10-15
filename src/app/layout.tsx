import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Chaanbean", template: "%s · Chaanbean" },
  description: "Credit checks, case checks and secured transactions for Indian businesses.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fc8019",
};

// Applies the saved light/dark choice before the first paint, so the page never flashes the wrong theme.
// Same storage key as the redesigned site (chaanbean_theme), so the choice carries across.
const themeScript = `(function(){try{var t=localStorage.getItem("chaanbean_theme");document.documentElement.classList.add(t==="dark"?"dark":"light")}catch(e){document.documentElement.classList.add("light")}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
