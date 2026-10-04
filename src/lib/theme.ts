"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * One light/dark setting for the whole platform (public site and portal).
 * The <html> "dark" class is the source of truth: the inline script in
 * app/layout.tsx sets it from localStorage before first paint, and every
 * toggle subscribes to it, so all switches always show the same state.
 */
export type Theme = "light" | "dark";
export const THEME_KEY = "chaanbean_theme";

function applyClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme !== "dark");
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(onChange: () => void) {
  // Any toggle on the page changes the class; another tab changes storage.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) applyClass(e.newValue === "dark" ? "dark" : "light");
  };
  window.addEventListener("storage", onStorage);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

export function setTheme(theme: Theme) {
  applyClass(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this page view.
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => setTheme(getSnapshot() === "dark" ? "light" : "dark"), []);
  return { theme, isDark: theme === "dark", toggle, setTheme };
}
