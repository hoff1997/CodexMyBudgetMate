import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Only set cookies on response, not request - fixes Set-Cookie header conflicts
          // Per https://github.com/supabase/ssr/issues/36
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure secure flag is set for production (Vercel uses HTTPS)
            const cookieOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) || 'lax',
            };
            response.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/ (Auth routes handle their own cookies)
     *
     * Note: We DO run middleware on /api routes to refresh sessions
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
