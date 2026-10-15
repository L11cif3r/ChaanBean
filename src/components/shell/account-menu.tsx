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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menu")}
        className="bg-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-orange transition-transform hover:-translate-y-0.5"
      >
        {initials || "?"}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold text-text">{name || t("noName")}</p>
            <p className="text-xs text-muted">{phone}</p>
          </div>
          {orgs.length ? (
            <div className="border-t border-border py-1">
              <p className="px-3 pb-1 pt-2 font-mono text-xs font-bold uppercase tracking-wider text-subtle">{t("organisations")}</p>
              {orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={o.id === active?.id}
                  onClick={() => (o.id === active?.id ? setOpen(false) : void switchTo(o.id))}
                  className={cn("flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-primary-softer", o.id === active?.id && "font-bold text-primary-text")}
                >
                  <span className="truncate">{o.name}</span>
                  <span className="shrink-0 text-xs text-muted">{t(`roles.${o.role}`)}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="border-t border-border pt-1">
            <a href="/signup/business" role="menuitem" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-primary-softer hover:text-primary-text">
              {t("addBusiness")}
            </a>
            <button type="button" role="menuitem" onClick={() => void signOut()} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-danger-fg hover:bg-danger-bg">
              {t("signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
