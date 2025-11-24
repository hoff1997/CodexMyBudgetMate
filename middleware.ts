import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  console.log("🔵 [MIDDLEWARE] Request:", request.nextUrl.pathname);

  const requestCookies = request.cookies.getAll();
  console.log("🔵 [MIDDLEWARE] Incoming cookies:", requestCookies.map(c => c.name).join(", ") || "NONE");

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
          const cookies = request.cookies.getAll();
          console.log("🔵 [MIDDLEWARE] getAll() called:", cookies.map(c => c.name).join(", ") || "NONE");
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log("🔵 [MIDDLEWARE] setAll() called with:", cookiesToSet.map(c => c.name).join(", "));
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.log("🔴 [MIDDLEWARE] Auth error:", error.message);
  } else if (user) {
    console.log("🟢 [MIDDLEWARE] User authenticated:", user.email);
  } else {
    console.log("🟡 [MIDDLEWARE] No user found");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
