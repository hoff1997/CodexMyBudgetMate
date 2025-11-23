"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";

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
