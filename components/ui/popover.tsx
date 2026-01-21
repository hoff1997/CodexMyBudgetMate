"use client";

import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type PopoverContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext(component: string) {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error(`<${component}> must be used within a <Popover> component.`);
  }
  return context;
}

type PopoverProps = {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (value: boolean) => void;
  modal?: boolean; // Not used but accepted for API compatibility
};

export function Popover({ children, open: openProp, onOpenChange, modal: _modal }: PopoverProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = openProp ?? uncontrolledOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      }
      if (openProp === undefined) {
        setUncontrolledOpen(value);
      }
    },
    [onOpenChange, openProp],
  );

  const value = useMemo<PopoverContextValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
    }),
    [open, setOpen],
  );

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

type PopoverTriggerProps = {
  asChild?: boolean;
  children: ReactElement;
};

export function PopoverTrigger({ asChild = false, children }: PopoverTriggerProps) {
  const { setOpen, triggerRef, open } = usePopoverContext("PopoverTrigger");

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      setOpen(!open);
      children.props.onClick?.(event);
    },
    [children, open, setOpen],
  );

  if (asChild) {
    return cloneElement(children, {
      ref: triggerRef,
      onClick: handleClick,
    });
  }

  return cloneElement(children, {
    ref: triggerRef,
    onClick: handleClick,
  });
}

type PopoverContentProps = {
  children: ReactNode;
  className?: string;
  sideOffset?: number;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right"; // Not fully implemented but accepted for API compatibility
  avoidCollisions?: boolean; // Not fully implemented but accepted for API compatibility
  collisionPadding?: number; // Not fully implemented but accepted for API compatibility
  onOpenAutoFocus?: (event: Event) => void; // Handler for auto-focus behavior
};

export function PopoverContent({
  children,
  className,
  sideOffset = 8,
  align = "center",
  side: _side,
  avoidCollisions: _avoidCollisions,
  collisionPadding: _collisionPadding,
  onOpenAutoFocus,
}: PopoverContentProps) {
  const { open, setOpen, triggerRef } = usePopoverContext("PopoverContent");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [container] = useState(() => {
    if (typeof document === "undefined") return null;
    const element = document.createElement("div");
    element.setAttribute("data-popover-container", "true");
    document.body.appendChild(element);
    return element;
  });

  useLayoutEffect(() => {
    return () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, [container]);

  useLayoutEffect(() => {
    if (!open || !contentRef.current || !triggerRef.current) return;

    const updatePosition = () => {
      if (!contentRef.current || !triggerRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();

      // Use fixed positioning (relative to viewport) for better compatibility with dialogs
      // getBoundingClientRect() returns viewport-relative coordinates which is what we need for fixed positioning
      let top = triggerRect.bottom + sideOffset;

      // Check if popover would go off screen at bottom
      const viewportHeight = window.innerHeight;
      if (top + contentRect.height > viewportHeight - 10) {
        // Position above the trigger instead
        top = triggerRect.top - contentRect.height - sideOffset;
      }

      // Calculate left position based on alignment
      let left: number;
      if (align === "start") {
        left = triggerRect.left;
      } else if (align === "end") {
        left = triggerRect.right - contentRect.width;
      } else {
        // center alignment
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
      }

      // Ensure popover doesn't go off screen horizontally
      const viewportWidth = window.innerWidth;
      if (left + contentRect.width > viewportWidth - 10) {
        left = viewportWidth - contentRect.width - 10;
      }
      if (left < 10) {
        left = 10;
      }

      contentRef.current.style.position = "fixed";
      contentRef.current.style.top = `${top}px`;
      contentRef.current.style.left = `${left}px`;
      contentRef.current.style.minWidth = `${Math.max(180, triggerRect.width)}px`;
      contentRef.current.style.zIndex = "99999"; // Higher than dialogs (z-50)
    };

    updatePosition();

    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open, triggerRef, sideOffset, align]);

  useLayoutEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      // Check if click is inside the popover content
      if (contentRef.current && contentRef.current.contains(target)) {
        return; // Click is inside popover, don't close
      }

      // Check if click is on the trigger
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return; // Click is on trigger, let toggle logic handle it
      }

      // Check if click is inside the popover container (portal)
      const popoverContainer = (target as Element).closest?.('[data-popover-container="true"]');
      if (popoverContainer) {
        return; // Click is somewhere in a popover portal, don't close
      }

      // Click is outside, close the popover
      setOpen(false);
    };

    // Use a small delay to avoid race conditions with click events
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, setOpen, triggerRef]);

  // Handle auto-focus behavior when popover opens
  useLayoutEffect(() => {
    if (!open || !onOpenAutoFocus) return;

    // Create a synthetic event to allow prevention
    const event = new Event('focus', { cancelable: true });
    onOpenAutoFocus(event);
  }, [open, onOpenAutoFocus]);

  if (!open || !container) {
    return null;
  }

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        "rounded-xl border border-border/60 bg-background p-4 text-sm shadow-xl",
        className,
      )}
      // Stop all mouse events from propagating to parent elements (like Dialog backdrop)
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    container,
  );
}
