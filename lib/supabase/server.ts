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
          return cookieStore.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }));
        },
        setAll(cookies) {
          const store = cookieStore as unknown as {
            set?: (options: { name: string; value: string } & CookieOptions) => void;
            delete?: (options: { name: string } & CookieOptions) => void;
          };
          cookies.forEach(({ name, value, options }) => {
            if (options.maxAge !== undefined && options.maxAge <= 0) {
              store.delete?.({ name, ...options });
            } else {
              store.set?.({ name, value, ...options });
            }
          });
        },
      },
    },
  );
}
