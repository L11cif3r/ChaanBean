"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SupportDrawer } from "./SupportDrawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");
  const isAuthOrIntro = pathname === "/intro" || pathname === "/login";

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

    if (!sessionActive || !authUser) {
      // Direct initial platform launch to the animated brand intro
      router.replace("/intro");
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
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F17]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F44851] border-t-transparent" />
          <span className="text-xs font-mono text-slate-500">Launching ChaanBean...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-chaan-bg text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <SupportDrawer />
    </div>
  );
}
