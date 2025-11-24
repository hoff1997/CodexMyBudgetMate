"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";

// Save the original fetch before overriding
const originalFetch = typeof window !== "undefined" ? window.fetch : undefined;

// Create a custom fetch wrapper that automatically includes credentials
const fetchWithCredentials: typeof fetch = (input, init?) => {
  // Only add credentials to same-origin requests (our API routes)
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const isSameOrigin = url.startsWith("/") || url.startsWith(window.location.origin);

  if (isSameOrigin) {
    return originalFetch!(input, {
      ...init,
      credentials: "include",
    });
  }

  return originalFetch!(input, init);
};

// Override global fetch for client-side components
if (typeof window !== "undefined" && originalFetch) {
  window.fetch = fetchWithCredentials;
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
        {children}
        <Toaster position="top-center" richColors expand />
      </CommandPaletteProvider>
    </QueryClientProvider>
  );
}
