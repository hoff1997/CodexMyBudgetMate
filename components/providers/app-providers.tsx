"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";

export default function AppProviders({ children }: { children: ReactNode }) {
  // Set up the global fetch wrapper on client-side only
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
        {children}
        <Toaster position="top-center" richColors expand />
      </CommandPaletteProvider>
    </QueryClientProvider>
  );
}
