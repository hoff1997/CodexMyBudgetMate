import type { ReactNode } from "react";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";
import Sidebar from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile for onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, show_onboarding_menu')
    .eq('user_id', user?.id)
    .single();

  const showOnboarding = profile?.show_onboarding_menu ?? true;

  return (
    <CommandPaletteProvider>
      <Sidebar userEmail={user?.email} showOnboardingMenu={showOnboarding}>
        {children}
      </Sidebar>
    </CommandPaletteProvider>
  );
}
