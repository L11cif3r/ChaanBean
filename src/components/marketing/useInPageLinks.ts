"use client";

import { useEffect } from "react";

function scrollToSection(hash: string, smooth: boolean) {
  // "#contact?plan=..." (older portal links) still means the contact section.
  const id = decodeURIComponent(hash.replace(/^#/, "").split("?")[0]);
  const el = id ? document.getElementById(id) : null;
  if (!el) return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: smooth && !reduce ? "smooth" : "auto", block: "start" });
  return true;
}

/**
 * Same-page links (#pricing, #contact, ...) scroll to their section without adding a
 * #hash to the address bar, so the page keeps its clean URL (e.g. /landing).
 */
export function useInPageLinks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href^='#']");
      const href = link?.getAttribute("href");
      if (href && href.length > 1 && scrollToSection(href, true)) e.preventDefault();
    };
    document.addEventListener("click", onClick);

    // Arriving from an old #link: go to the section, then tidy the address.
    if (window.location.hash.length > 1) {
      const hash = window.location.hash;
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      window.setTimeout(() => scrollToSection(hash, false), 60);
    }
    return () => document.removeEventListener("click", onClick);
  }, []);
}
