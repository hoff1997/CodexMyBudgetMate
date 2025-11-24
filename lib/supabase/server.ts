import { cookies } from "next/headers";
import { type CookieOptions, createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();
          console.log("🟣 [SERVER CLIENT] getAll() called, cookies:", allCookies.map(c => c.name).join(", ") || "NONE");
          return allCookies;
        },
        setAll(cookiesToSet) {
          console.log("🟣 [SERVER CLIENT] setAll() called with:", cookiesToSet.map(c => c.name).join(", "));
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log(`🟣 [SERVER CLIENT] Setting cookie: ${name}, path: ${options?.path}, maxAge: ${options?.maxAge}`);
              cookieStore.set(name, value, options);
            });
            console.log("🟢 [SERVER CLIENT] All cookies set successfully");
          } catch (error) {
            // In Server Components, we can't modify cookies - only read them
            // This is expected and safe to ignore on pages that only need to read auth state
            // Log the error in development to help debug authentication issues
            console.error('🔴 [SERVER CLIENT] Failed to set cookies:', error);
          }
        },
      },
    },
  );
}
