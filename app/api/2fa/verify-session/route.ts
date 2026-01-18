import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  MFA_VERIFIED_COOKIE,
  MFA_SESSION_TIMEOUT_MS,
  isMfaSessionFresh,
  parseMfaVerifiedCookie,
} from "@/lib/utils/mfa-session";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

/**
 * GET /api/2fa/verify-session
 *
 * Check if the current MFA session is still valid (within 2 hours).
 * Returns session status and time remaining.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createUnauthorizedError();
    }

    // Check if user has MFA enabled
    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return createErrorResponse(factorsError, 500, "Failed to check MFA status");
    }

    const hasMfaEnabled = factorsData.totp.some((f) => f.status === "verified");

    if (!hasMfaEnabled) {
      // User doesn't have MFA enabled - no session to verify
      return NextResponse.json({
        mfaEnabled: false,
        sessionValid: true, // No MFA means no session required
        message: "MFA not enabled",
      });
    }

    // Check MFA verification timestamp from cookie
    const cookieStore = await cookies();
    const mfaVerifiedCookie = cookieStore.get(MFA_VERIFIED_COOKIE);
    const verifiedAt = parseMfaVerifiedCookie(mfaVerifiedCookie?.value);
    const sessionFresh = isMfaSessionFresh(verifiedAt);

    const timeRemaining = verifiedAt
      ? Math.max(0, verifiedAt + MFA_SESSION_TIMEOUT_MS - Date.now())
      : 0;

    return NextResponse.json({
      mfaEnabled: true,
      sessionValid: sessionFresh,
      verifiedAt,
      timeRemaining,
      expiresAt: verifiedAt ? verifiedAt + MFA_SESSION_TIMEOUT_MS : null,
    });
  } catch (error) {
    console.error("MFA session check error:", error);
    return NextResponse.json(
      { error: "Failed to check MFA session" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/2fa/verify-session
 *
 * Verify MFA code and refresh the session timestamp.
 * This extends the MFA session for another 2 hours.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createUnauthorizedError();
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return createValidationError("Verification code is required");
    }

    // Get user's MFA factors
    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return createErrorResponse(factorsError, 500, "Failed to get MFA factors");
    }

    const totpFactor = factorsData.totp.find((f) => f.status === "verified");

    if (!totpFactor) {
      return createValidationError("MFA not enabled for this account");
    }

    // Create a challenge for the factor
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

    if (challengeError) {
      console.error("MFA challenge error:", challengeError);
      return createErrorResponse(challengeError, 400, "Failed to create challenge");
    }

    // Verify the code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      console.error("MFA verify error:", verifyError);
      return createValidationError("Invalid verification code");
    }

    // Set the MFA verified timestamp cookie
    const now = Date.now();
    const cookieStore = await cookies();
    cookieStore.set(MFA_VERIFIED_COOKIE, now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MFA_SESSION_TIMEOUT_MS / 1000, // Convert to seconds
      path: "/",
    });

    return NextResponse.json({
      success: true,
      verifiedAt: now,
      expiresAt: now + MFA_SESSION_TIMEOUT_MS,
      message: "MFA session verified for 2 hours",
    });
  } catch (error) {
    console.error("MFA session verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify MFA session" },
      { status: 500 }
    );
  }
}
