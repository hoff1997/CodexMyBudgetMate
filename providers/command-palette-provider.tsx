"use client";

import { createContext, useCallback, useContext, useMemo, useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { CommandSheet, CommandSection, CommandItem } from "@/components/ui/command-sheet";
import { usePathname, useRouter } from "next/navigation";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Search, Home, Banknote, Repeat2, Wallet, BarChart3, ListChecks, Settings, Wallet2, AlignLeft } from "lucide-react";
import type { CommandAction } from "@/types/command";

type CommandPaletteContextValue = {
  register: (id: string, action: CommandAction) => void;
  unregister: (id: string) => void;
  openPalette: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(undefined);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const actionsRef = useRef<Map<string, CommandAction>>(new Map());
  const renderTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const target = document.body;
    renderTargetRef.current = target;
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isPaletteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isPaletteShortcut) {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const register = useCallback((id: string, action: CommandAction) => {
    actionsRef.current.set(id, action);
  }, []);

  const unregister = useCallback((id: string) => {
    actionsRef.current.delete(id);
  }, []);

  const value = useMemo<CommandPaletteContextValue>(() => ({
    register,
    unregister,
    openPalette: () => setOpen(true),
  }), [register, unregister]);

  const renderedSheet = renderTargetRef.current
    ? createPortal(
        <CommandPalette
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setQuery("");
          }}
          query={query}
          onQueryChange={setQuery}
          actions={Array.from(actionsRef.current.values())}
        />,
        renderTargetRef.current,
      )
    : null;

  return (
    <CommandPaletteContext.Provider value={value}>
      {renderedSheet}
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return context;
}

function CommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  actions,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  actions: CommandAction[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const debouncedQuery = useDebounce(query, 150);
  const supabase = useMemo(() => createBrowserClient(), []);

  const navigationLinks = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard", description: "Overview snapshot", icon: <Home className="h-4 w-4" /> },
      { label: "Budget Allocation", href: "/budgetallocation", description: "Manage your envelopes & allocations", icon: <Wallet className="h-4 w-4" /> },
      { label: "Reconcile", href: "/reconcile", description: "Approve & assign transactions", icon: <AlignLeft className="h-4 w-4" /> },
      { label: "Envelope planning", href: "/envelope-planning", description: "Adjust targets and contributions", icon: <ListChecks className="h-4 w-4" /> },
      { label: "Recurring income", href: "/recurring-income", description: "Manage automated pay splits", icon: <Repeat2 className="h-4 w-4" /> },
      { label: "Reports", href: "/reports", description: "Spending, income, debt", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Debt management", href: "/debt-management", description: "Payoff strategies", icon: <Banknote className="h-4 w-4" /> },
      { label: "Settings", href: "/settings", description: "Preferences and configuration", icon: <Settings className="h-4 w-4" /> },
    ],
    [],
  );

  const filteredNavigation = useMemo(() => {
    if (!query) return navigationLinks;
    const lower = query.toLowerCase();
    return navigationLinks.filter(
      (link) =>
        link.label.toLowerCase().includes(lower) ||
        link.description?.toLowerCase().includes(lower) ||
        link.href.toLowerCase().includes(lower),
    );
  }, [navigationLinks, query]);

  const { data: envelopeResults } = useQuery({
    queryKey: ["command-envelopes", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery?.trim()) return [] as Array<{
        id: string;
        name: string;
        category_id: string;
        target_amount: number;
        current_amount: number;
      }>;
      const { data } = await supabase
        .from("envelopes")
        .select("id, name, category_id, target_amount, current_amount")
        .ilike("name", `%${debouncedQuery}%`)
        .limit(8);
      return data ?? [];
    },
    enabled: Boolean(debouncedQuery?.trim()),
  });

  const { data: transactionResults } = useQuery({
    queryKey: ["command-transactions", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery?.trim()) return [] as Array<{
        id: string;
        merchant_name: string | null;
        amount: number;
        occurred_at: string;
        envelope_name: string | null;
      }>;
      const { data } = await supabase
        .from("transactions_view")
        .select("id, merchant_name, amount, occurred_at, envelope_name")
        .ilike("merchant_name", `%${debouncedQuery}%`)
        .order("occurred_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    enabled: Boolean(debouncedQuery?.trim()),
  });

  const filteredActions = useMemo(() => {
    if (!query) return actions;
    const lower = query.toLowerCase();
    return actions.filter(
      (action) =>
        action.label.toLowerCase().includes(lower) ||
        action.description?.toLowerCase().includes(lower) ||
        action.group?.toLowerCase().includes(lower),
    );
  }, [actions, query]);

  const isLoading = useMemo(() => {
    return Boolean(debouncedQuery?.trim()) && (!envelopeResults || !transactionResults);
  }, [debouncedQuery, envelopeResults, transactionResults]);

  function handleNavigate(href: string) {
    onOpenChange(false);
    if (href !== pathname) {
      router.push(href);
    }
  }

  return (
    <CommandSheet
      open={open}
      onOpenChange={onOpenChange}
      query={query}
      onQueryChange={onQueryChange}
      isLoading={isLoading}
    >
      <CommandSection title="Navigation">
        {filteredNavigation.length ? (
          filteredNavigation.map((link) => (
            <CommandItem
              key={link.href}
              title={link.label}
              description={link.description}
              icon={link.icon}
              onSelect={() => handleNavigate(link.href)}
            />
          ))
        ) : (
          <CommandItem title="No pages" description="Try another search" onSelect={() => null} disabled />
        )}
      </CommandSection>

      {Boolean(envelopeResults?.length) ? (
        <CommandSection title="Envelopes">
          {envelopeResults?.map((env) => (
            <CommandItem
              key={env.id}
              title={env.name}
              description={`Balance ${formatCurrency(env.current_amount)} of ${formatCurrency(env.target_amount)}`}
              icon={<Wallet2 className="h-4 w-4" />}
              onSelect={() => handleNavigate(`/budgetallocation?highlight=${env.id}`)}
            />
          ))}
        </CommandSection>
      ) : null}

      {Boolean(transactionResults?.length) ? (
        <CommandSection title="Transactions">
          {transactionResults?.map((tx) => (
            <CommandItem
              key={tx.id}
              title={tx.merchant_name ?? "Transaction"}
              description={`${formatCurrency(tx.amount)} • ${tx.envelope_name ?? "Unassigned"}`}
              icon={<Search className="h-4 w-4" />}
              onSelect={() => handleNavigate(`/reconcile?focus=${tx.id}`)}
            />
          ))}
        </CommandSection>
      ) : null}

      {filteredActions.length ? (
        <CommandSection title="Quick actions">
          {filteredActions.map((action) => (
            <CommandItem
              key={action.id}
              title={action.label}
              description={action.description}
              shortcut={action.shortcut}
              icon={action.icon}
              onSelect={() => {
                onOpenChange(false);
                action.onSelect();
              }}
            />
          ))}
        </CommandSection>
      ) : null}
    </CommandSheet>
  );
}

export function useRegisterCommand(action: CommandAction) {
  const { register, unregister } = useCommandPalette();
  useEffect(() => {
    register(action.id, action);
    return () => unregister(action.id);
  }, [action, register, unregister]);
}

function formatCurrency(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(numeric);
}
