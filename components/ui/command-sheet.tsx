"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

type CommandSheetProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  isLoading?: boolean;
  children: React.ReactNode;
};

export function CommandSheet({
  open,
  onOpenChange,
  query,
  onQueryChange,
  isLoading = false,
  children,
}: CommandSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 top-[15vh] z-50 mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search…"
              className="h-10 border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {isLoading ? (
              <span className="text-xs text-muted-foreground">Searching…</span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Esc
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-2 py-3">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CommandSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 py-3">
      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

export function CommandItem({
  title,
  description,
  shortcut,
  icon,
  onSelect,
  disabled = false,
}: {
  title: string;
  description?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onSelect();
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
      disabled={disabled}
    >
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      <span className="flex-1">
        <span className="block text-sm font-medium text-secondary">{title}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      {shortcut ? (
        <kbd className="rounded border bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
          {shortcut}
        </kbd>
      ) : null}
    </button>
  );
}
