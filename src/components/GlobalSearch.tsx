"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, User, Shield, Users, AlertOctagon, X } from "lucide-react";

interface SearchResult {
  id: string;
  type: "debtor" | "vendor" | "default" | "trust_profile";
  title: string;
  subtitle: string;
  identifier: string;
  badge: string;
  badgeColor: "green" | "amber" | "red" | "sky";
  href: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = containerRef.current?.querySelector("input");
        input?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  };

  const badgeStyles: Record<string, string> = {
    green: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
    amber: "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    red: "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60",
    sky: "bg-orange-50 dark:bg-orange-950/80 text-[#FC8019] border-orange-200 dark:border-orange-800/60",
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "debtor":
        return <User size={14} className="text-[#FC8019]" />;
      case "vendor":
        return <Users size={14} className="text-emerald-600 dark:text-emerald-400" />;
      case "default":
        return <AlertOctagon size={14} className="text-rose-600 dark:text-rose-400" />;
      case "trust_profile":
        return <Shield size={14} className="text-amber-600 dark:text-amber-400" />;
      default:
        return <Search size={14} className="text-slate-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0 || query.length >= 2) setIsOpen(true);
          }}
          placeholder="Search by Business Name, GSTIN, PAN, Phone, or Trust ID..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/90 pl-10 pr-20 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#FC8019] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition shadow-inner font-sans"
        />
        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
          {loading ? (
            <Loader2 size={13} className="animate-spin text-[#FC8019]" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="pointer-events-auto text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>Live Database Matches ({results.length})</span>
            <span>ESC to close</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {loading && results.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#FC8019]" />
                Searching database entities...
              </div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">No direct matches found for "{query}"</p>
                <p className="text-[11px] text-slate-500">
                  Try searching by full 15-digit GSTIN, 10-digit PAN, or company name.
                </p>
              </div>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r.href)}
                  className="w-full text-left p-3 rounded-lg hover:bg-orange-50/60 dark:hover:bg-slate-800/70 transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                      {getIcon(r.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#FC8019] transition truncate">
                          {r.title}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                          {r.identifier}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {r.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${badgeStyles[r.badgeColor]}`}
                    >
                      {r.badge}
                    </span>
                    <ArrowRight size={13} className="text-slate-400 group-hover:text-[#FC8019] transition" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
