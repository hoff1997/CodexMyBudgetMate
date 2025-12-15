import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Cached user fetch - deduplicated across all Server Components in a single request.
 * Use this instead of calling supabase.auth.getUser() directly.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
});

/**
 * Get user with profile in a single parallel fetch.
 * Returns both user auth data and profile data.
 */
export const getUserWithProfile = cache(async () => {
  const supabase = await createClient();

  // First get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return { user: null, profile: null, error: authError };
  }

  // Then fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed, show_onboarding_menu, full_name, avatar_url, pay_cycle, default_page')
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile, error: profileError };
});
