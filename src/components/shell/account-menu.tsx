"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/api-client";

export interface MenuOrg {
  id: string;
  name: string;
  role: string;
}

/** Top-bar account menu (wireframe S04): organisation, initials, organisation switcher (FR-AUTH-05) and sign out. */
export function AccountMenu({ name, phone, orgs, activeOrgId }: { name: string; phone: string; orgs: MenuOrg[]; activeOrgId: string | null }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const initials = (name || active?.name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function switchTo(orgId: string) {
    setOpen(false);
    const res = await api("/api/v1/me/active-org", { body: { orgId } });
    if (res.ok) router.refresh();
  }

  async function signOut() {
    await api("/api/v1/auth/signout", { body: {} });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {active ? <span className="hidden max-w-48 truncate text-sm font-medium text-text md:inline">{active.name}</span> : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menu")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-on"
      >
        {initials || "?"}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-10 z-40 w-72 rounded-xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-text">{name || t("noName")}</p>
            <p className="text-xs text-muted">{phone}</p>
          </div>
          {orgs.length ? (
            <div className="border-t border-border py-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("organisations")}</p>
              {orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={o.id === active?.id}
                  onClick={() => (o.id === active?.id ? setOpen(false) : void switchTo(o.id))}
                  className={cn("flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted", o.id === active?.id && "font-semibold")}
                >
                  <span className="truncate">{o.name}</span>
                  <span className="shrink-0 text-xs text-muted">{t(`roles.${o.role}`)}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="border-t border-border pt-1">
            <a href="/signup/business" role="menuitem" className="block rounded-md px-3 py-2 text-sm hover:bg-surface-muted">
              {t("addBusiness")}
            </a>
            <button type="button" role="menuitem" onClick={() => void signOut()} className="block w-full rounded-md px-3 py-2 text-left text-sm text-danger-fg hover:bg-danger-bg">
              {t("signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
