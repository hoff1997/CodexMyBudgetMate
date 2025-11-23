import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookies = document.cookie.split(';');
          const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
          return cookie ? cookie.split('=')[1] : null;
        },
        set(name: string, value: string, options: any) {
          let cookie = `${name}=${value}`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          cookie += `; path=${options?.path || '/'}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
          if (options?.secure) cookie += '; secure';
          document.cookie = cookie;
        },
        remove(name: string, options: any) {
          document.cookie = `${name}=; path=${options?.path || '/'}; max-age=0`;
        },
      },
    }
  );
