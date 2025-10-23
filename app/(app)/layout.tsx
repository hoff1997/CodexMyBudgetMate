import type { ReactNode } from "react";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CommandPaletteProvider>
      <main className="min-h-screen bg-background">
        {children}
      </main>
    </CommandPaletteProvider>
  );
}
