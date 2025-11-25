import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";
import Sidebar from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if no user (prevents layout crash)
  if (!user) {
    redirect('/login');
  }

  // Fetch user profile for onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, show_onboarding_menu')
    .eq('id', user.id)
    .maybeSingle();

  const showOnboarding = profile?.show_onboarding_menu ?? true;

  return (
    <CommandPaletteProvider>
      <Sidebar userEmail={user?.email} showOnboardingMenu={showOnboarding}>
        {children}
      </Sidebar>
    </CommandPaletteProvider>
  );
}
