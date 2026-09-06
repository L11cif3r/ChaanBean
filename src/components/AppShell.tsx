"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SupportDrawer } from "./SupportDrawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isAuthOrIntro = pathname === "/intro" || pathname === "/login";

  if (isAdmin || isAuthOrIntro) {
    return <>{children}</>;
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
