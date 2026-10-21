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
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold text-white shadow-orange transition-[scale] duration-150 active:scale-[0.95]"
      >
        {initials || "?"}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-11 z-40 w-72 origin-top-right animate-[cb-dialog_0.18s_cubic-bezier(.25,1,.5,1)_both] rounded-[10px] bg-menu p-1 shadow-lg backdrop-blur-xl backdrop-saturate-150">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-text">{name || t("noName")}</p>
            <p className="text-xs text-muted">{phone}</p>
          </div>
          {orgs.length ? (
            <div className="-mx-1 border-t border-border px-1 py-1">
              <p className="px-2.5 pb-2 pt-2.5 text-[11px] font-medium uppercase leading-none tracking-[1px] text-subtle">{t("organisations")}</p>
              {orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={o.id === active?.id}
                  onClick={() => (o.id === active?.id ? setOpen(false) : void switchTo(o.id))}
                  className={cn("flex h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-xs text-muted hover:bg-hover hover:text-text", o.id === active?.id && "font-medium text-text")}
                >
                  <span className="truncate">{o.name}</span>
                  <span className="shrink-0 text-xs text-muted">{t(`roles.${o.role}`)}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="-mx-1 border-t border-border px-1 pt-1">
            <a href="/signup/business" role="menuitem" className="flex h-8 items-center rounded-md px-2.5 text-xs text-muted hover:bg-hover hover:text-text">
              {t("addBusiness")}
            </a>
            <button type="button" role="menuitem" onClick={() => void signOut()} className="flex h-8 w-full items-center rounded-md px-2.5 text-left text-xs font-medium text-danger-fg hover:bg-danger-bg">
              {t("signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
