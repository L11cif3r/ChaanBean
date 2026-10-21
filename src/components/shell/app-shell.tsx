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
  tagline: string;
  about: { title: string; points: string[] };
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
    <nav aria-label={label} className="cb-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {groups.map((g, gi) => (
        <div key={g.label} className={cn("flex flex-col gap-1 px-3 py-2.5", gi === 0 && "pt-1")}>
          <p className="px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-[1.2px] text-subtle">{g.label}</p>
          <ul className="flex flex-col gap-px">
            {g.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={item.subtitle}
                    className={cn(
                      "group relative flex min-h-10 items-center gap-3 rounded-xl px-2.5 py-2 text-sm leading-tight outline-none transition-[background-color,color,box-shadow,scale] duration-150 ease-[cubic-bezier(.25,1,.5,1)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-soft font-semibold text-text" : "text-muted hover:bg-hover hover:text-text",
                    )}
                  >
                    {active ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[image:var(--grad-brand)]" aria-hidden="true" /> : null}
                    <Icon aria-hidden="true" className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-subtle group-hover:text-text")} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
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

function SidebarBrand({ tagline }: { tagline: string }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="Chaanbean home">
      <Image src="/brand/icon.png" alt="" width={34} height={34} className="size-[34px] shrink-0 rounded-xl shadow-sm" priority />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-head text-[15px] font-extrabold leading-none tracking-[-0.02em] text-text">Chaan<span className="text-gradient">Bean</span></span>
        <span className="truncate text-xs leading-none text-subtle">{tagline}</span>
      </span>
    </Link>
  );
}

/** Short plain-language note at the foot of the sidebar, so a new MSME user knows what the portal is for. */
function SidebarAbout({ about }: { about: Labels["about"] }) {
  return (
    <div className="shrink-0 border-t border-border p-3">
      <div className="rounded-2xl bg-soft p-3.5">
        <p className="text-xs font-bold text-text">{about.title}</p>
        <ul className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-muted">
          {about.points.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Signed-in layout (wireframe S04) in the ObsidianUI dashboard-shell style: a quiet sidebar with small uppercase group
 * labels and a sliding white pill on the current page, a blurred top bar with the organisation, plan, wallet and theme,
 * and the page. Below 1024 px the sidebar becomes a drawer.
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
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        {labels.skipToContent}
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="flex h-16 shrink-0 items-center px-4">
          <SidebarBrand tagline={labels.tagline} />
        </div>
        <Nav groups={groups} label={labels.mainNavigation} />
        <SidebarAbout about={labels.about} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div
          className={cn("absolute inset-0 bg-black/40 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          id="mobile-nav"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[264px] max-w-[85vw] flex-col border-r border-border bg-sidebar shadow-[0_16px_40px_rgb(0_0_0/0.35)] transition-transform duration-300 ease-[cubic-bezier(.25,1,.5,1)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
            <SidebarBrand tagline={labels.tagline} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-2 text-subtle hover:bg-hover hover:text-text"
              aria-label={labels.closeMenu}
              tabIndex={open ? 0 : -1}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {open ? <Nav groups={groups} label={labels.mainNavigation} onNavigate={() => setOpen(false)} /> : null}
          {open ? <SidebarAbout about={labels.about} /> : null}
        </aside>
      </div>

      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-[var(--nav-bg)] px-3 backdrop-blur-xl backdrop-saturate-150 sm:gap-3 sm:px-6">
          <button
            type="button"
            className="-ml-1 inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-text shadow-sm lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={labels.openMenu}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <Menu size={16} aria-hidden="true" />
          </button>
          <div className="flex min-w-0 items-center gap-2">{start}</div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">{topbar}</div>
        </header>
        <main id="main" className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <span className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-soft opacity-70 [mask-image:linear-gradient(180deg,#000,transparent)]" aria-hidden="true" />
          {children}
        </main>
      </div>
    </div>
  );
}
