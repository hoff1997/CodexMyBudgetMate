"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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
  // Mobile slide-in menu state
  const [isOpen, setIsOpen] = useState(false);
  // Desktop collapsible sidebar state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Mobile methods
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Desktop methods
  const collapseDesktop = useCallback(() => setIsDesktopCollapsed(true), []);
  const expandDesktop = useCallback(() => setIsDesktopCollapsed(false), []);
  const toggleDesktop = useCallback(() => setIsDesktopCollapsed((prev) => !prev), []);

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
