"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Logo } from "./logo";

export interface NavGroup {
  label: string;
  items: { href: string; label: string }[];
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
    <nav aria-label={label} className="flex-1 overflow-y-auto px-3 pb-6">
      {groups.map((g) => (
        <div key={g.label} className="mt-5 first:mt-2">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">{g.label}</p>
          <ul className="mt-1.5 space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md border-l-[3px] px-3 py-2 text-sm",
                      active
                        ? "border-accent bg-sidebar-active font-semibold text-white"
                        : "border-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-white",
                    )}
                  >
                    {item.label}
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

/**
 * Signed-in layout from wireframe S04: dark sidebar with grouped navigation, a top bar with plan, wallet and
 * organisation, and the page. Below 1024 px the sidebar becomes a drawer opened from the top bar.
 */
export function AppShell({
  groups,
  labels,
  topbar,
  children,
}: {
  groups: NavGroup[];
  labels: Labels;
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
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm">
        {labels.skipToContent}
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="px-6 py-5">
          <Logo tone="light" />
        </div>
        <Nav groups={groups} label={labels.mainNavigation} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-black/40 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <aside
          id="mobile-nav"
          className={cn("absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar transition-transform", open ? "translate-x-0" : "-translate-x-full")}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <Logo tone="light" />
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-sidebar-text hover:bg-sidebar-hover" aria-label={labels.closeMenu} tabIndex={open ? 0 : -1}>
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {open ? <Nav groups={groups} label={labels.mainNavigation} onNavigate={() => setOpen(false)} /> : null}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="-ml-1 rounded-md p-2 text-text hover:bg-surface-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={labels.openMenu}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2">{topbar}</div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
