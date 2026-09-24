"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SupportDrawer } from "./SupportDrawer";
import { SidebarProvider } from "./SidebarContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");
  const isAuthOrIntro = pathname === "/intro" || pathname === "/login" || pathname === "/subscription" || pathname === "/landing";

  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    if (isAuthOrIntro) {
      setIsAuthorized(true);
      return;
    }

    // Check if active session exists in current browser
    const sessionActive = sessionStorage.getItem("chaanbean_session_active");
    const authUser = localStorage.getItem("chaanbean_auth");
    const hasSubCookie = typeof document !== "undefined" && document.cookie.includes("chaanbean_subscription=active");
    const hasSessionCookie = typeof document !== "undefined" && (document.cookie.includes("chaanbean_session=client") || document.cookie.includes("chaanbean_session=admin"));

    if ((!sessionActive && !authUser) || (!hasSubCookie && !hasSessionCookie)) {
      // Auto-initialize default client session so direct hosted station links open smoothly
      sessionStorage.setItem("chaanbean_session_active", "true");
      localStorage.setItem(
        "chaanbean_auth",
        JSON.stringify({
          email: "demo@chaanbean.com",
          name: "Acme Traders Pvt Ltd",
          companyName: "Acme Traders Pvt Ltd",
          role: "client",
        })
      );
      document.cookie = "chaanbean_session=client; path=/; max-age=86400";
      document.cookie = "chaanbean_subscription=active; path=/; max-age=86400";
      setIsAuthorized(true);
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, isAuthOrIntro, router]);

  if (isAdmin || isAuthOrIntro) {
    return <>{children}</>;
  }

  // Prevent flash of unauthenticated customer dashboard on client
  if (!mounted || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-12 w-16 animate-pulse">
            <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FC8019] border-t-transparent" />
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Launching ChaanBean...</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <SupportDrawer />
      </div>
    </SidebarProvider>
  );
}
