"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const SIDEBAR_STORAGE_KEY = "mbm-sidebar-collapsed";

// Pages that should have the sidebar collapsed by default
const COLLAPSED_BY_DEFAULT_PATHS = ["/budgetallocation"];

interface SidebarContextType {
  // Mobile sidebar (slide-in menu)
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  // Desktop sidebar (collapsible)
  isDesktopCollapsed: boolean;
  collapseDesktop: () => void;
  expandDesktop: () => void;
  toggleDesktop: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Mobile slide-in menu state
  const [isOpen, setIsOpen] = useState(false);

  // Track if user has manually set a preference for this session
  const [hasUserPreference, setHasUserPreference] = useState(false);

  // Desktop collapsible sidebar state - initialised on client
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isInitialised, setIsInitialised] = useState(false);

  // Initialise from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setIsDesktopCollapsed(stored === "true");
      setHasUserPreference(true);
    }
    setIsInitialised(true);
  }, []);

  // Set collapse state based on pathname (only if user hasn't set a preference)
  useEffect(() => {
    if (!isInitialised || hasUserPreference) return;

    // Check if we're on a page that should be collapsed by default
    const shouldCollapse = COLLAPSED_BY_DEFAULT_PATHS.some(
      (path) => pathname === path || pathname?.startsWith(`${path}/`)
    );

    setIsDesktopCollapsed(shouldCollapse);
  }, [pathname, isInitialised, hasUserPreference]);

  // Mobile methods
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Desktop methods - save to localStorage when user manually toggles
  const collapseDesktop = useCallback(() => {
    setIsDesktopCollapsed(true);
    setHasUserPreference(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "true");
    }
  }, []);

  const expandDesktop = useCallback(() => {
    setIsDesktopCollapsed(false);
    setHasUserPreference(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "false");
    }
  }, []);

  const toggleDesktop = useCallback(() => {
    setHasUserPreference(true);
    setIsDesktopCollapsed((prev) => {
      const newValue = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue));
      }
      return newValue;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{
      isOpen,
      open,
      close,
      toggle,
      isDesktopCollapsed,
      collapseDesktop,
      expandDesktop,
      toggleDesktop,
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    // Return no-op functions when not in a SidebarProvider
    // This allows components to safely call sidebar methods without crashing
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      isDesktopCollapsed: false,
      collapseDesktop: () => {},
      expandDesktop: () => {},
      toggleDesktop: () => {},
    };
  }
  return context;
}
