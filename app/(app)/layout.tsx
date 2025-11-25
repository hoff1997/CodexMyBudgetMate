import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CommandPaletteProvider } from "@/providers/command-palette-provider";
import Sidebar from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  console.log('🔷 [APP LAYOUT] Starting auth check');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log('🔷 [APP LAYOUT] Auth result:', {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    error: error?.message
  });

  // Redirect to login if no user (prevents layout crash)
  if (!user) {
    console.log('🔴 [APP LAYOUT] No user found, redirecting to /login');
    redirect('/login');
  }

  console.log('✅ [APP LAYOUT] User authenticated, continuing');

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
