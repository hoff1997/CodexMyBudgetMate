import { cookies } from "next/headers";
import { type CookieOptions, createServerClient } from "@supabase/ssr";

export async function createClient() {
  console.log('🔵 [SERVER CLIENT] createClient() called');
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();
          console.log('🟣 [SERVER CLIENT] getAll() called');
          console.log('🟣 [SERVER CLIENT] Cookies found:', allCookies.map(c => `${c.name}=${c.value?.substring(0, 20) ?? ''}...`).join(', ') || 'NONE');
          console.log('🟣 [SERVER CLIENT] Total cookies:', allCookies.length);
          return allCookies;
        },
        setAll(cookiesToSet) {
          console.log('🟡 [SERVER CLIENT] setAll() called (read-only mode)');
          console.log('🟡 [SERVER CLIENT] Would set cookies:', cookiesToSet.map(c => c.name).join(', '));
          // In Server Components/API Routes, we can only READ cookies, not set them
          // Session refresh and cookie updates happen in middleware, not here
          // Attempting to set cookies here causes them to be deleted
        },
      },
    },
  );
}
