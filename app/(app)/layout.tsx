import type { ReactNode } from "react";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";
import Sidebar from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CommandPaletteProvider>
      <Sidebar>{children}</Sidebar>
    </CommandPaletteProvider>
  );
}
