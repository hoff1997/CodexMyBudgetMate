"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";
import { CelebrationProvider } from "@/components/achievements/CelebrationProvider";

// Set up global fetch wrapper ONCE at module load (not in component render)
// This ensures all fetch calls include credentials before any components mount
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;

  // Only override if not already overridden
  if (!window.fetch.toString().includes("credentials")) {
    window.fetch = function fetchWithCredentials(input, init?) {
      // Only add credentials to same-origin requests (our API routes)
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const isSameOrigin = url.startsWith("/") || url.startsWith(window.location.origin);

      if (isSameOrigin) {
        return originalFetch(input, {
          ...init,
          credentials: "include",
        });
      }

      return originalFetch(input, init);
    };
  }
}

export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CommandPaletteProvider>
        <CelebrationProvider>
          {children}
          <Toaster position="top-center" richColors expand />
        </CelebrationProvider>
      </CommandPaletteProvider>
    </QueryClientProvider>
  );
}
