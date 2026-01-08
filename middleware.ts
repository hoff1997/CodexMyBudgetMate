import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Kid session verification (mirrors lib/utils/kid-session.ts)
// MUST match the fallback in lib/utils/kid-session.ts exactly
const KID_SESSION_SECRET = process.env.KID_SESSION_SECRET || "fallback-secret-change-in-production";
const KID_SESSION_COOKIE = "kid_session";

// Helper to convert ArrayBuffer to hex string (Edge-compatible)
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper to decode base64url (Edge-compatible)
function base64urlDecode(str: string): string {
  // Replace base64url chars with base64 chars
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  // Decode
  return atob(padded);
}

// Async verification using Web Crypto API (Edge-compatible)
async function verifyKidSessionFromCookie(cookieValue: string): Promise<{ valid: boolean; childId?: string }> {
  try {
    const [encodedPayload, signature] = cookieValue.split(".");
    if (!encodedPayload || !signature) {
      console.log("[KID SESSION] Missing payload or signature");
      return { valid: false };
    }

    // Decode the payload first (Edge-compatible base64url decode)
    const payload = base64urlDecode(encodedPayload);

    // Create HMAC key using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(KID_SESSION_SECRET);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign the payload
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    // Convert to hex for comparison
    const expectedSignature = arrayBufferToHex(signatureBuffer);

    if (signature !== expectedSignature) {
      console.log("[KID SESSION] Signature mismatch");
      console.log("[KID SESSION] Got:", signature.substring(0, 20) + "...");
      console.log("[KID SESSION] Expected:", expectedSignature.substring(0, 20) + "...");
      return { valid: false };
    }

    // Parse and check expiry
    const session = JSON.parse(payload);
    if (!session.expiresAt || session.expiresAt < Date.now()) {
      console.log("[KID SESSION] Session expired");
      return { valid: false };
    }
    if (!session.isKidSession) {
      console.log("[KID SESSION] Not a kid session flag");
      return { valid: false };
    }

    console.log("[KID SESSION] Valid session for child:", session.childId);
    return { valid: true, childId: session.childId };
  } catch (err) {
    console.log("[KID SESSION] Error verifying:", err);
    return { valid: false };
  }
}

export async function middleware(request: NextRequest) {
  // Audit mode bypass - disable auth for site audit
  // Set NEXT_PUBLIC_AUDIT_MODE=true in .env.local to enable
  if (process.env.NEXT_PUBLIC_AUDIT_MODE === 'true') {
    console.log('[AUDIT MODE] Bypassing auth middleware for:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  // Kid dashboard routes require valid kid session
  // Match /kids/[childId]/dashboard, /kids/[childId]/chores, etc.
  const kidRouteMatch = pathname.match(/^\/kids\/([^/]+)\/(dashboard|chores|money|goals|invoices|shop|wishlist)/);
  if (kidRouteMatch) {
    console.log("[KID ROUTE] Checking session for:", pathname);
    const sessionCookie = request.cookies.get(KID_SESSION_COOKIE);
    console.log("[KID ROUTE] Cookie present:", !!sessionCookie);

    if (!sessionCookie) {
      // No session - redirect to kid login
      console.log("[KID ROUTE] No cookie, redirecting to login");
      return NextResponse.redirect(new URL("/kids/login", request.url));
    }

    const { valid, childId } = await verifyKidSessionFromCookie(sessionCookie.value);

    if (!valid) {
      // Invalid or expired session - clear cookie and redirect
      const response = NextResponse.redirect(new URL("/kids/login", request.url));
      response.cookies.delete(KID_SESSION_COOKIE);
      return response;
    }

    // Verify the session matches the requested child ID
    const requestedChildId = kidRouteMatch[1];
    if (childId !== requestedChildId) {
      // Session doesn't match requested child - redirect to their dashboard
      return NextResponse.redirect(new URL(`/kids/${childId}/dashboard`, request.url));
    }
  }

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
