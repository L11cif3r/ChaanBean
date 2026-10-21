"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Landmark, Loader2, Plus, Search, UserRound, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { isValidGstin } from "@/lib/validators";
import { GST_STATES } from "@/server/providers/identity/states";

// PRD v4.0 section 4: one box for a company name, GSTIN or CIN/LLPIN. Your saved buyers show at once; from 3 letters
// the server adds MCA company records (up to 50, best first, Active first) with CIN, city, state, registration date and
// status, narrowed by state, city and "Active only". Picking a record adds it as a buyer for free (FR-SR-06, 08).
// Firms that are not in MCA records (proprietors, partnerships) are added by GSTIN.

export interface CompanyOption {
  id: string;
  name: string;
  tradeName: string | null;
  gstin: string | null;
  panMasked: string | null;
  city: string | null;
}

interface Hit {
  source: "yours" | "mca" | "gst";
  key: string;
  name: string;
  tradeName: string | null;
  cin: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  registrationDate: string | null;
  kind: string | null;
  datasetDate: string | null;
  counterpartyId: string | null;
}

interface SearchResult {
  kind: "gstin" | "cin" | "name" | "short";
  yours: Hit[];
  matches: Hit[];
  gstState: "found" | "not_found" | "unavailable" | null;
  mcaReady: boolean;
  datasetDate: string | null;
  sample: boolean;
}

const MAX_LOCAL = 8;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const STATES = Object.values(GST_STATES).sort((a, b) => a.localeCompare(b, "en-IN"));

/** Types the example searches into the empty box one letter at a time, then clears them (the hero placeholder). */
function useTypedExamples(examples: string[], on: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!on || !examples.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    let n = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = examples[i % examples.length];
      n += deleting ? -1 : 1;
      setText(word.slice(0, n));
      if (!deleting && n === word.length) { deleting = true; timer = setTimeout(tick, 1600); return; }
      if (deleting && n === 0) { deleting = false; i++; timer = setTimeout(tick, 350); return; }
      timer = setTimeout(tick, deleting ? 28 : 70);
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [examples, on]);
  return text;
}

const fromOption = (c: CompanyOption): Hit => ({
  source: "yours", key: c.id, name: c.name, tradeName: c.tradeName, cin: null, gstin: c.gstin, city: c.city, state: null,
  status: null, registrationDate: null, kind: null, datasetDate: null, counterpartyId: c.id,
});

export function CompanySearch({ companies, value, onChange, hero, examples = [] }: {
  companies: CompanyOption[];
  value: string | null;
  /** The option is passed for a company just added from search, before the page's list includes it. */
  onChange: (id: string | null, added?: CompanyOption) => void;
  /** The big search in the middle of the start page, with a turning ring and typed examples. */
  hero?: boolean;
  examples?: string[];
}) {
  const t = useTranslations("checks.search");
  const router = useRouter();
  const toast = useToast();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  /** A company just added from search, shown as chosen before the page's buyer list catches up. */
  const [picked, setPicked] = useState<CompanyOption | null>(null);
  const selected = companies.find((c) => c.id === value) ?? (picked?.id === value ? picked : null);
  const example = useTypedExamples(examples, Boolean(hero) && !focused && !query);

  const trimmed = query.trim();
  const remote = norm(trimmed).length >= 3;

  // Server search, a moment after the user stops typing. Results for an older query are ignored.
  useEffect(() => {
    if (!remote) return;
    const ctrl = { stale: false };
    const timer = setTimeout(async () => {
      setLoading(true);
      const qs = new URLSearchParams({ q: trimmed, active_only: String(activeOnly), ...(state ? { state } : {}), ...(city.trim() ? { city: city.trim() } : {}) });
      const res = await api<SearchResult>(`/api/v1/companies/search?${qs}`);
      if (ctrl.stale) return;
      setLoading(false);
      if (res.ok) { setResult(res.data); setActive(0); }
    }, 280);
    return () => { ctrl.stale = true; clearTimeout(timer); };
  }, [remote, trimmed, state, city, activeOnly]);

  const local = useMemo(() => {
    const q = norm(query);
    if (!q) return companies.slice(0, MAX_LOCAL);
    return companies
      .map((c) => {
        const fields = [c.name, c.tradeName ?? "", c.gstin ?? "", c.city ?? ""].map(norm);
        const score = fields[0].startsWith(q) || fields[1].startsWith(q) ? 0 : fields[2].startsWith(q) ? 1 : fields.some((f) => f.includes(q)) ? 2 : -1;
        return { c, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
      .slice(0, MAX_LOCAL)
      .map((x) => x.c);
  }, [companies, query]);

  const fresh = remote && result && !loading;
  const yours: Hit[] = fresh ? mergeYours(local.map(fromOption), result.yours) : local.map(fromOption);
  const others: Hit[] = fresh ? result.matches : [];
  const items = [...yours, ...others];

  const typed = trimmed.toUpperCase().replace(/\s/g, "");
  const looksLikeGstin = isValidGstin(typed);
  const addHref = `/counterparties/new?${new URLSearchParams(looksLikeGstin ? { gstin: typed, then: "check" } : { then: "check" })}`;

  function close() { setOpen(false); }

  async function pick(h: Hit) {
    if (h.counterpartyId) {
      onChange(h.counterpartyId);
      setQuery("");
      close();
      return;
    }
    setPicking(h.key);
    const res = await api<{ id: string; created: boolean }>("/api/v1/companies/pick", {
      body: h.source === "gst" ? { source: "gst", gstin: h.key } : { source: "mca", cin: h.key },
    });
    setPicking(null);
    if (!res.ok) { toast(res.error.message, "danger"); return; }
    const added = { id: res.data.id, name: h.name, tradeName: h.tradeName, gstin: h.gstin, panMasked: null, city: h.city ?? h.state };
    setPicked(added);
    if (res.data.created) toast(t("added", { name: h.name }), "success");
    onChange(res.data.id, added);
    setQuery("");
    close();
    router.refresh();
  }

  if (selected) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface-muted p-2.5 sm:max-w-xl">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-orange" aria-hidden="true"><Building2 size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-head text-[15px] font-bold text-text">{selected.name}</p>
          <p className="truncate text-xs text-muted">{[selected.gstin ?? selected.panMasked, selected.city].filter(Boolean).join(" · ")}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-text-2 shadow-sm hover:text-text"
          onClick={() => { onChange(null); setPicked(null); setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }}
        >
          <X size={14} aria-hidden="true" /> {t("change")}
        </button>
      </div>
    );
  }

  const box = (
    <>
      <Search size={hero ? 20 : 16} className={cn("pointer-events-none absolute z-10 text-subtle", hero ? "left-4 top-[18px]" : "left-3 top-3")} aria-hidden="true" />
      {hero && !query && !focused && example ? (
        <span className="pointer-events-none absolute left-12 top-[17px] z-10 truncate pr-5 text-base text-placeholder" aria-hidden="true">
          {t("tryPrefix")} <span className="font-medium text-text-2">{example}</span><span className="animate-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary" />
        </span>
      ) : null}
      <input
        ref={inputRef}
        id="buyer"
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={hero && !focused && example ? "" : t("placeholder")}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => { setOpen(true); setFocused(true); }}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && open && items[active]) { e.preventDefault(); void pick(items[active]); }
          else if (e.key === "Escape") close();
        }}
        className={cn(
          "w-full text-text placeholder:text-placeholder focus:outline-none [&::-webkit-search-cancel-button]:appearance-none",
          hero
            ? "h-14 rounded-2xl border-0 bg-transparent pl-12 pr-12 text-base shadow-none"
            : "h-11 rounded-xl border border-border bg-field pl-9 pr-10 text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]",
        )}
      />
      {loading ? (
        <Loader2 size={16} className={cn("absolute z-10 animate-spin text-subtle", hero ? "right-5 top-5" : "right-3 top-3")} aria-label={t("loading")} />
      ) : query ? (
        <button
          type="button"
          aria-label={t("clear")}
          onClick={() => { setQuery(""); setResult(null); inputRef.current?.focus(); }}
          className={cn("absolute z-10 inline-flex size-8 items-center justify-center rounded-md text-subtle hover:bg-hover hover:text-text", hero ? "right-3 top-3" : "right-1 top-1")}
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </>
  );

  const option = (h: Hit, i: number) => {
    const Icon = h.source === "gst" ? Landmark : Building2;
    const inactive = h.status && !/^active$/i.test(h.status);
    return (
      <li
        key={`${h.source}-${h.key}`}
        id={`${listId}-${i}`}
        role="option"
        aria-selected={i === active}
        onMouseDown={(e) => { e.preventDefault(); void pick(h); }}
        onMouseEnter={() => setActive(i)}
        className={cn("mx-1 flex cursor-pointer items-start gap-3 rounded-md px-3 py-2", i === active && "bg-hover")}
      >
        <Icon size={16} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text">{h.name}{h.tradeName && h.tradeName !== h.name ? <span className="font-normal text-muted"> · {h.tradeName}</span> : null}</span>
            {h.status && h.source !== "yours" ? (
              <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium", inactive ? "bg-danger-bg text-danger-fg" : "bg-success-bg text-success-fg")}>{h.status}</span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted">
            {[h.cin ?? h.gstin, h.city, h.state, h.registrationDate ? t("since", { date: formatDate(h.registrationDate) }) : null].filter(Boolean).join(" · ")}
          </span>
          {h.source === "mca" && h.datasetDate ? <span className="block text-[11px] text-subtle">{t("dataDate", { date: formatDate(h.datasetDate) })}</span> : null}
        </span>
        {picking === h.key ? <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-primary" aria-hidden="true" /> : null}
      </li>
    );
  };

  const nothing = remote && fresh && !items.length;

  return (
    <div
      ref={wrapRef}
      className={cn("relative", hero ? "w-full" : "sm:max-w-xl")}
      onBlur={(e) => { if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setTimeout(close, 120); }}
    >
      {hero ? (
        <div className={cn("relative rounded-2xl border border-border bg-surface shadow-md transition-shadow duration-200", focused && "border-primary shadow-[0_0_0_4px_var(--primary-soft),0_12px_32px_-12px_rgb(252_106_16/0.35)]")}>
          {box}
        </div>
      ) : (
        box
      )}
      {!open && !hero ? <p className="mt-1.5 text-xs text-subtle">{t("hint")}</p> : null}
      {open ? (
        <div className={cn("absolute inset-x-0 top-[calc(100%+6px)] z-30 origin-top animate-[cb-dialog_0.18s_cubic-bezier(.25,1,.5,1)_both] overflow-hidden rounded-[10px] bg-menu text-left shadow-lg backdrop-blur-xl backdrop-saturate-150")}>
          {remote ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-2.5 py-2">
              <label className="sr-only" htmlFor={`${listId}-state`}>{t("state")}</label>
              <select
                id={`${listId}-state`}
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-8 min-w-0 flex-1 rounded-md bg-surface px-2 text-xs text-text shadow-control sm:flex-none"
              >
                <option value="">{t("allStates")}</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="sr-only" htmlFor={`${listId}-city`}>{t("city")}</label>
              <input
                id={`${listId}-city`}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("city")}
                className="h-8 w-28 min-w-0 flex-1 rounded-md bg-surface px-2 text-xs text-text shadow-control sm:flex-none"
              />
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 px-1 text-xs text-text-2">
                <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                {t("activeOnly")}
              </label>
            </div>
          ) : null}
          <ul id={listId} role="listbox" aria-label={t("results")} aria-busy={loading} className="max-h-[22rem] overflow-y-auto py-1">
            {yours.length ? <li className="px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase leading-none tracking-[1px] text-subtle" role="presentation">{t("yourBuyers")}</li> : null}
            {yours.map((h, i) => option(h, i))}
            {others.length ? (
              <li className="px-4 pb-2 pt-3 text-[11px] font-medium uppercase leading-none tracking-[1px] text-subtle" role="presentation">
                {others[0].source === "gst" ? t("gstRecord") : t("mcaRecords", { count: others.length })}
              </li>
            ) : null}
            {others.map((h, i) => option(h, yours.length + i))}
            {remote && loading && !others.length ? <li className="px-4 py-3 text-sm text-muted" role="presentation">{t("loading")}…</li> : null}
            {!remote && trimmed && !yours.length ? <li className="px-4 py-3 text-sm text-muted" role="presentation">{t("keepTyping")}</li> : null}
            {nothing ? (
              <li className="px-4 py-3 text-sm text-muted" role="presentation">
                {result?.gstState === "unavailable" ? t("gstUnavailable") : result?.kind === "gstin" ? t("gstNotFound") : !result?.mcaReady && result?.kind === "name" ? t("mcaNotReady") : t("noMatch", { query: trimmed })}
              </li>
            ) : null}
            {fresh && result?.sample ? <li className="px-4 pb-2 text-[11px] font-medium text-warning-fg" role="presentation">{t("sampleGst")}</li> : null}
          </ul>
          <div className="border-t border-border">
            <Link href={addHref} className="m-1 flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-text hover:bg-hover">
              <Plus size={16} aria-hidden="true" />
              {looksLikeGstin ? t("addGstin", { gstin: typed }) : t("addByGstin")}
            </Link>
            <p className="flex items-center gap-2 px-4 pb-3 text-xs text-subtle"><UserRound size={14} aria-hidden="true" /> {t("personSoon")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Saved buyers found on the page and by the server, once each. */
function mergeYours(local: Hit[], server: Hit[]): Hit[] {
  const seen = new Set(local.map((h) => h.key));
  return [...local, ...server.filter((h) => !seen.has(h.key))];
}
