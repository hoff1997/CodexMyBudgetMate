import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";
import Sidebar from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { getUserWithProfile } from "@/lib/server/get-user";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Use cached fetch - deduplicated across all server components in this request
  const { user, profile } = await getUserWithProfile();

  // Redirect to login if no user (prevents layout crash)
  if (!user) {
    redirect('/login');
  }

  const showOnboarding = profile?.show_onboarding_menu ?? true;

  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <Sidebar userEmail={user?.email} showOnboardingMenu={showOnboarding}>
          {children}
        </Sidebar>
      </SidebarProvider>
    </CommandPaletteProvider>
  );
}
