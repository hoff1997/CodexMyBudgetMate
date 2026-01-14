import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  MFA_VERIFIED_COOKIE,
  MFA_SESSION_TIMEOUT_MS,
  isMfaSessionFresh,
  parseMfaVerifiedCookie,
} from "@/lib/utils/mfa-session";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has MFA enabled
    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return NextResponse.json(
        { error: "Failed to check MFA status" },
        { status: 500 }
      );
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Get user's MFA factors
    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return NextResponse.json(
        { error: "Failed to get MFA factors" },
        { status: 500 }
      );
    }

    const totpFactor = factorsData.totp.find((f) => f.status === "verified");

    if (!totpFactor) {
      return NextResponse.json(
        { error: "MFA not enabled for this account" },
        { status: 400 }
      );
    }

    // Create a challenge for the factor
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

    if (challengeError) {
      console.error("MFA challenge error:", challengeError);
      return NextResponse.json(
        { error: challengeError.message || "Failed to create challenge" },
        { status: 400 }
      );
    }

    // Verify the code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      console.error("MFA verify error:", verifyError);
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
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
