import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPin, isLegacyPinHash, hashPin } from "@/lib/utils/family-code-generator";
import { createKidSessionToken } from "@/lib/utils/kid-session";
import {
  checkRateLimit,
  checkGlobalIpLimit,
  recordFailedAttempt,
  recordGlobalIpAttempt,
  recordSuccessfulAttempt,
  clearGlobalIpAttempts,
  getRateLimitKey,
} from "@/lib/utils/rate-limiter";
import { validateCsrfRequest, extractCsrfToken } from "@/lib/utils/csrf";

// Helper to get client IP
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

// POST: Verify PIN and create kid session (step 2 of kid login)
export async function POST(request: NextRequest) {
  // Use service client to bypass RLS - kids aren't authenticated users
  const supabase = createServiceClient();
  const clientIP = getClientIP(request);

  try {
    const body = await request.json();
    const { childId, pin, csrfToken: bodyToken } = body;

    // Validate CSRF token
    const csrfToken = extractCsrfToken(request, { csrfToken: bodyToken });
    const csrfValidation = await validateCsrfRequest(csrfToken);
    if (!csrfValidation.valid) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh and try again." },
        { status: 403 }
      );
    }

    // Validate inputs
    if (!childId) {
      return NextResponse.json(
        { error: "Child ID is required" },
        { status: 400 }
      );
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    // Check global IP rate limit first (prevents distributed attacks)
    const globalCheck = await checkGlobalIpLimit(clientIP);
    if (globalCheck.isLimited) {
      const minutes = Math.ceil(globalCheck.remainingSeconds / 60);
      return NextResponse.json(
        {
          error: `Too many login attempts from your network. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
          locked: true,
          remainingSeconds: globalCheck.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Check per-target rate limit
    const rateLimitKey = getRateLimitKey(clientIP, childId);
    const rateLimitCheck = await checkRateLimit(rateLimitKey);

    if (rateLimitCheck.isLimited) {
      const minutes = Math.ceil(rateLimitCheck.remainingSeconds / 60);
      return NextResponse.json(
        {
          error: `Too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
          locked: true,
          remainingSeconds: rateLimitCheck.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Get child profile with PIN hash
    const { data: child, error } = await supabase
      .from("child_profiles")
      .select(
        `
        id,
        name,
        avatar_url,
        pin_hash,
        parent_user_id,
        star_balance,
        screen_time_balance
      `
      )
      .eq("id", childId)
      .single();

    if (error || !child) {
      // Record failed attempt (even if child not found)
      await recordFailedAttempt(rateLimitKey);
      await recordGlobalIpAttempt(clientIP);
      return NextResponse.json(
        { error: "Child profile not found" },
        { status: 404 }
      );
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, child.pin_hash);

    if (!isValidPin) {
      // Record failed attempt for both per-target and global IP
      const failResult = await recordFailedAttempt(rateLimitKey);
      const globalResult = await recordGlobalIpAttempt(clientIP);

      // Check if global limit was hit
      if (globalResult.locked) {
        const minutes = Math.ceil(globalResult.lockoutSeconds / 60);
        return NextResponse.json(
          {
            error: `Too many login attempts from your network. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
            locked: true,
            remainingSeconds: globalResult.lockoutSeconds,
          },
          { status: 429 }
        );
      }

      if (failResult.locked) {
        const minutes = Math.ceil(failResult.lockoutSeconds / 60);
        return NextResponse.json(
          {
            error: `Too many failed attempts. Account locked for ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
            locked: true,
            remainingSeconds: failResult.lockoutSeconds,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Incorrect PIN",
          attemptsRemaining: failResult.attemptsRemaining,
        },
        { status: 401 }
      );
    }

    // Successful login - clear rate limits
    await recordSuccessfulAttempt(rateLimitKey);
    await clearGlobalIpAttempts(clientIP);

    // If using legacy PIN hash, upgrade to bcrypt
    if (isLegacyPinHash(child.pin_hash)) {
      const newHash = await hashPin(pin);
      await supabase
        .from("child_profiles")
        .update({ pin_hash: newHash })
        .eq("id", childId);
    }

    // Create secure HttpOnly session token
    const { session, token, cookieName, maxAge } = createKidSessionToken({
      id: child.id,
      name: child.name,
      avatar_url: child.avatar_url,
      parent_user_id: child.parent_user_id,
      star_balance: child.star_balance,
      screen_time_balance: child.screen_time_balance,
    });

    // Create response and set cookie on it
    const response = NextResponse.json({
      data: {
        session: {
          childId: session.childId,
          name: session.name,
          avatarUrl: session.avatarUrl,
          expiresAt: session.expiresAt,
        },
        message: `Welcome back, ${child.name}!`,
      },
    });

    // Set HttpOnly cookie on the response
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (err) {
    console.error("Error in POST /api/kids/auth/login:", err);
    return NextResponse.json(
      { error: "Failed to process login" },
      { status: 500 }
    );
  }
}
