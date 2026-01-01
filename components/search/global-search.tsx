"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search, DollarSign, Wallet, Receipt, Layers, Settings, FileText, Home } from "lucide-react";
import { formatCurrency } from "@/lib/finance";

interface SearchResult {
  id: string;
  type: "transaction" | "envelope" | "account" | "page";
  title: string;
  subtitle?: string;
  href: string;
  amount?: number;
}

const QUICK_PAGES = [
  { id: "dashboard", title: "Dashboard", href: "/dashboard", icon: Home },
  { id: "reconcile", title: "Reconciliation Centre", href: "/reconcile", icon: Receipt },
  { id: "transactions", title: "Transactions", href: "/transactions", icon: DollarSign },
  { id: "envelope-summary", title: "Envelope Summary", href: "/envelope-summary", icon: Wallet },
  { id: "allocation", title: "Allocation", href: "/budgetallocation", icon: Layers },
  { id: "accounts", title: "Accounts", href: "/accounts", icon: FileText },
  { id: "settings", title: "Settings", href: "/settings", icon: Settings },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult | typeof QUICK_PAGES[0]) => {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return <DollarSign className="h-4 w-4 text-[#6B6B6B]" />;
      case "envelope":
        return <Wallet className="h-4 w-4 text-[#7A9E9A]" />;
      case "account":
        return <FileText className="h-4 w-4 text-[#6B9ECE]" />;
      default:
        return <Search className="h-4 w-4 text-[#9CA3AF]" />;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full justify-start gap-2 border-[#E5E7EB] bg-white text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B6B6B]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left text-xs">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[#E5E7EB] bg-[#F9FAFB] px-1.5 font-mono text-[10px] font-medium text-[#9CA3AF]">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search transactions, envelopes, pages..."
          value={query}
          onValueChange={setQuery}
          className="text-[#3D3D3D] placeholder:text-[#9CA3AF]"
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? (
              <span className="text-[#9CA3AF]">Searching...</span>
            ) : query ? (
              <span className="text-[#9CA3AF]">No results found for "{query}"</span>
            ) : (
              <span className="text-[#9CA3AF]">Type to search...</span>
            )}
          </CommandEmpty>

          {!query && (
            <CommandGroup heading="Quick Navigation">
              {QUICK_PAGES.map((page) => (
                <CommandItem
                  key={page.id}
                  onSelect={() => handleSelect(page)}
                  className="gap-2 cursor-pointer"
                >
                  <page.icon className="h-4 w-4 text-[#6B6B6B]" />
                  <span className="text-[#3D3D3D]">{page.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.filter((r) => r.type === "transaction").length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Transactions">
                {results
                  .filter((r) => r.type === "transaction")
                  .slice(0, 5)
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="gap-2 cursor-pointer"
                    >
                      {getIcon(result.type)}
                      <div className="flex-1">
                        <span className="text-[#3D3D3D]">{result.title}</span>
                        {result.subtitle && (
                          <span className="ml-2 text-xs text-[#9CA3AF]">{result.subtitle}</span>
                        )}
                      </div>
                      {result.amount !== undefined && (
                        <span className={result.amount < 0 ? "text-[#6B9ECE]" : "text-[#7A9E9A]"}>
                          {formatCurrency(result.amount)}
                        </span>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}

          {results.filter((r) => r.type === "envelope").length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Envelopes">
                {results
                  .filter((r) => r.type === "envelope")
                  .slice(0, 5)
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="gap-2 cursor-pointer"
                    >
                      {getIcon(result.type)}
                      <div className="flex-1">
                        <span className="text-[#3D3D3D]">{result.title}</span>
                        {result.subtitle && (
                          <span className="ml-2 text-xs text-[#9CA3AF]">{result.subtitle}</span>
                        )}
                      </div>
                      {result.amount !== undefined && (
                        <span className="text-[#7A9E9A]">{formatCurrency(result.amount)}</span>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}

          {results.filter((r) => r.type === "account").length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Accounts">
                {results
                  .filter((r) => r.type === "account")
                  .slice(0, 5)
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="gap-2 cursor-pointer"
                    >
                      {getIcon(result.type)}
                      <div className="flex-1">
                        <span className="text-[#3D3D3D]">{result.title}</span>
                        {result.subtitle && (
                          <span className="ml-2 text-xs text-[#9CA3AF]">{result.subtitle}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
