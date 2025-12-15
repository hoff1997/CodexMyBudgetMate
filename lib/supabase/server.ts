import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // In Server Components/API Routes, we can only READ cookies, not set them
          // Session refresh and cookie updates happen in middleware, not here
          // Attempting to set cookies here causes them to be deleted
        },
      },
    },
  );
}
