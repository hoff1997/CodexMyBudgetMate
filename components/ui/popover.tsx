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
};

export function Popover({ children, open: openProp, onOpenChange }: PopoverProps) {
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
};

export function PopoverContent({
  children,
  className,
  sideOffset = 8,
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
      const top = triggerRect.bottom + sideOffset + window.scrollY;
      const left = triggerRect.left + window.scrollX;
      const width = triggerRect.width;

      contentRef.current.style.position = "absolute";
      contentRef.current.style.top = `${top}px`;
      contentRef.current.style.left = `${left}px`;
      contentRef.current.style.minWidth = `${Math.max(180, width)}px`;
      contentRef.current.style.zIndex = "9999";
    };

    updatePosition();

    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open, triggerRef, sideOffset]);

  useLayoutEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        contentRef.current &&
        !contentRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, setOpen, triggerRef]);

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
    >
      {children}
    </div>,
    container,
  );
}
