"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Building2,
  CreditCard,
  Handshake,
  LayoutDashboard,
  Menu,
  Scale,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Icon per navigation key (src/lib/screens.ts NAV). Kept here because icons cannot cross from server to client. */
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  counterparties: Building2,
  creditCheck: ShieldCheck,
  caseCheck: Scale,
  transactions: ArrowLeftRight,
  settlements: Handshake,
  team: Users,
  billing: CreditCard,
  settings: Settings,
};

export interface NavGroup {
  label: string;
  items: { href: string; label: string; subtitle: string; icon: string }[];
}

interface Labels {
  openMenu: string;
  closeMenu: string;
  mainNavigation: string;
  skipToContent: string;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavProps {
  groups: NavGroup[];
  label: string;
  /** Called when a link is chosen (closes the mobile drawer). */
  onNavigate?: () => void;
}

function NavList({ groups, label, onNavigate, pathname }: NavProps & { pathname: string }) {
  return (
    <nav aria-label={label} className="flex-1 space-y-4 overflow-y-auto p-3 pb-6">
      {groups.map((g) => (
        <div key={g.label} className="space-y-1.5">
          <p className="px-2 font-mono text-[0.8125rem] font-bold uppercase leading-[1.2rem] tracking-wider text-subtle">{g.label}</p>
          <ul className="space-y-1.5">
            {g.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative block rounded-2xl border p-2.5 text-left transition-all duration-200",
                      active
                        ? "border-primary bg-primary-soft shadow-md shadow-primary/10"
                        : "border-border bg-surface shadow-sm hover:border-border-strong hover:bg-surface-muted",
                    )}
                  >
                    {active ? <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-primary" aria-hidden="true" /> : null}
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "shrink-0 rounded-xl p-1.5 transition-colors",
                          active ? "bg-primary text-white shadow-sm" : "bg-surface-strong text-text-2 group-hover:text-primary",
                        )}
                        aria-hidden="true"
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn("block truncate text-xs font-bold leading-tight", active ? "text-text" : "text-text-2 group-hover:text-text")}
                        >
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.8125rem] leading-[1.2rem] text-subtle">{item.subtitle}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ActiveNav(props: NavProps) {
  return <NavList {...props} pathname={usePathname()} />;
}

/**
 * Navigation with the current page marked. The path is only known at request time on dynamic routes, so the marked
 * version streams in; until then the same links render without a marker.
 */
function Nav(props: NavProps) {
  return (
    <Suspense fallback={<NavList {...props} pathname="" />}>
      <ActiveNav {...props} />
    </Suspense>
  );
}

function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden" aria-label="Chaanbean home">
      <Image src="/brand/icon.png" alt="" width={30} height={30} className="shrink-0 rounded-lg" priority />
      <span className="truncate text-base font-black tracking-tight text-text">ChaanBean</span>
    </Link>
  );
}

/**
 * Signed-in layout (wireframe S04, styled as the redesigned portal): white sidebar of icon cards in groups, a top bar
 * with the organisation, plan, wallet and theme, and the page. Below 1024 px the sidebar becomes a drawer.
 */
export function AppShell({
  groups,
  labels,
  start,
  topbar,
  children,
}: {
  groups: NavGroup[];
  labels: Labels;
  /** Left side of the top bar (organisation). */
  start?: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-dvh bg-bg lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        {labels.skipToContent}
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh xl:w-72">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
          <SidebarBrand />
        </div>
        <Nav groups={groups} label={labels.mainNavigation} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div
          className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          id="mobile-nav"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <SidebarBrand />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-text"
              aria-label={labels.closeMenu}
              tabIndex={open ? 0 : -1}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {open ? <Nav groups={groups} label={labels.mainNavigation} onNavigate={() => setOpen(false)} /> : null}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-[var(--nav-bg)] px-3 backdrop-blur-md sm:gap-4 sm:px-6">
          <button
            type="button"
            className="-ml-1 rounded-lg p-2 text-text hover:bg-surface-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={labels.openMenu}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="flex min-w-0 items-center gap-2">{start}</div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">{topbar}</div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
