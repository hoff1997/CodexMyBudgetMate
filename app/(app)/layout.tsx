import type { ReactNode } from "react";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";
import Sidebar from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <CommandPaletteProvider>
      <Sidebar userEmail={user?.email}>{children}</Sidebar>
    </CommandPaletteProvider>
  );
}
