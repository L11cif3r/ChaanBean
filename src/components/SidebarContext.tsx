"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleCollapse: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
  toggleCollapse: () => {},
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  toggleMobile: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpenState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("chaanbean_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsedState(saved === "true");
      } else {
        // Automatically default to folded/collapsed on mobile & tablet for clean visibility
        if (window.innerWidth < 1024) {
          setIsCollapsedState(true);
        }
      }
    } catch {}

    const handleResize = () => {
      // If resizing to large desktop, close mobile drawer overlay
      if (window.innerWidth >= 1024) {
        setIsMobileOpenState(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const setIsCollapsed = (collapsed: boolean | ((prev: boolean) => boolean)) => {
    setIsCollapsedState((prev) => {
      const next = typeof collapsed === "function" ? collapsed(prev) : collapsed;
      try {
        localStorage.setItem("chaanbean_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const setIsMobileOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    setIsMobileOpenState(open);
  };

  const toggleMobile = () => {
    setIsMobileOpenState((prev) => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        toggleCollapse,
        isMobileOpen,
        setIsMobileOpen,
        toggleMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
