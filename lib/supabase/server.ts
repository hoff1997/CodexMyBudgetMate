import { cookies } from "next/headers";
import { type CookieOptions, createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

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
          // In Server Components/API Routes, we can only READ cookies, not set them
          // Session refresh and cookie updates happen in middleware, not here
          // Attempting to set cookies here causes them to be deleted
          console.log("🟣 [SERVER CLIENT] setAll() called with:", cookiesToSet.map(c => c.name).join(", "), "- ignoring (read-only context)");
        },
      },
    },
  );
}
