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
import { createErrorResponse, createValidationError } from "@/lib/utils/api-error";

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

// Validate login key format: XXXX-XXXX-XXXX (alphanumeric, no confusing chars)
function isValidLoginKeyFormat(key: string): boolean {
  // Secure format: 3 groups of 4 alphanumeric characters
  const securePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return securePattern.test(key.toUpperCase());
}

/**
 * POST: Single-step login with login key + PIN
 *
 * This is more secure than the old two-step flow because:
 * 1. No "list children" step that reveals information
 * 2. Each child has a unique, unguessable key
 * 3. Supports browser credential saving (autocomplete)
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const clientIP = getClientIP(request);

  try {
    const body = await request.json();
    const { loginKey, pin, csrfToken: bodyToken } = body;

    // Validate CSRF token
    const csrfToken = extractCsrfToken(request, { csrfToken: bodyToken });
    const csrfValidation = await validateCsrfRequest(csrfToken);
    if (!csrfValidation.valid) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh and try again." },
        { status: 403 }
      );
    }

    // Validate login key format
    if (!loginKey || !isValidLoginKeyFormat(loginKey)) {
      return createValidationError("Invalid login key format. Should be XXXX-XXXX-XXXX");
    }

    // Validate PIN format
    if (!pin || !/^\d{4}$/.test(pin)) {
      return createValidationError("PIN must be exactly 4 digits");
    }

    const normalizedKey = loginKey.toUpperCase();

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

    // Check per-key rate limit (prevents brute force on specific key)
    const rateLimitKey = getRateLimitKey(clientIP, `key:${normalizedKey}`);
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

    // Look up child by login key
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
        screen_time_balance,
        is_teen_mode,
        can_reconcile_transactions,
        can_add_external_income,
        auto_graduation_date
      `
      )
      .eq("login_key", normalizedKey)
      .single();

    if (error || !child) {
      // Don't reveal if key exists or not - same error for both cases
      await recordFailedAttempt(rateLimitKey);
      await recordGlobalIpAttempt(clientIP);
      return NextResponse.json(
        { error: "Invalid login key or PIN" },
        { status: 401 }
      );
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, child.pin_hash);

    if (!isValidPin) {
      // Record failed attempt for both per-key and global IP
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
            error: `Too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
            locked: true,
            remainingSeconds: failResult.lockoutSeconds,
          },
          { status: 429 }
        );
      }

      // Same generic error - don't reveal if key was correct
      return NextResponse.json(
        {
          error: "Invalid login key or PIN",
          attemptsRemaining: failResult.attemptsRemaining,
        },
        { status: 401 }
      );
    }

    // Successful login - clear rate limits
    await recordSuccessfulAttempt(rateLimitKey);
    await clearGlobalIpAttempts(clientIP);

    // Update last used timestamp
    await supabase
      .from("child_profiles")
      .update({ login_key_last_used_at: new Date().toISOString() })
      .eq("id", child.id);

    // If using legacy PIN hash, upgrade to bcrypt
    if (isLegacyPinHash(child.pin_hash)) {
      const newHash = await hashPin(pin);
      await supabase
        .from("child_profiles")
        .update({ pin_hash: newHash })
        .eq("id", child.id);
    }

    // Create secure HttpOnly session token
    const { session, token, cookieName, maxAge } = createKidSessionToken({
      id: child.id,
      name: child.name,
      avatar_url: child.avatar_url,
      parent_user_id: child.parent_user_id,
      star_balance: child.star_balance,
      screen_time_balance: child.screen_time_balance,
      is_teen_mode: child.is_teen_mode,
      can_reconcile_transactions: child.can_reconcile_transactions,
      can_add_external_income: child.can_add_external_income,
      auto_graduation_date: child.auto_graduation_date,
    });

    // Create response and set cookie
    const response = NextResponse.json({
      data: {
        session: {
          childId: session.childId,
          name: session.name,
          avatarUrl: session.avatarUrl,
          expiresAt: session.expiresAt,
          isTeenMode: session.isTeenMode,
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
    console.error("Error in POST /api/kids/auth/login-key:", err);
    return createErrorResponse(err as Error, 500, "Failed to process login");
  }
}
