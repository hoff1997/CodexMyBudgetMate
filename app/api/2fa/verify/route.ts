import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { MFA_VERIFIED_COOKIE, MFA_SESSION_TIMEOUT_MS } from "@/lib/utils/mfa-session";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

/**
 * POST /api/2fa/verify
 *
 * Verifies the TOTP code during setup to complete enrollment.
 * After verification, 2FA is enabled for the user.
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
    const { factorId, code } = body;

    if (!factorId || !code) {
      return createValidationError("Factor ID and code are required");
    }

    // Create a challenge for the factor
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      });

    if (challengeError) {
      console.error("MFA challenge error:", challengeError);
      return createErrorResponse(challengeError, 400, "Failed to create challenge");
    }

    // Verify the code
    const { data: verifyData, error: verifyError } =
      await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

    if (verifyError) {
      console.error("MFA verify error:", verifyError);
      return createErrorResponse(verifyError, 400, "Invalid verification code");
    }

    // Generate backup codes (stored in user profile or separate table)
    const backupCodes = generateBackupCodes(10);

    // Store backup codes in database (hashed)
    const { error: storeError } = await supabase.from("user_backup_codes").upsert(
      {
        user_id: user.id,
        codes: backupCodes.map((code) => hashBackupCode(code)),
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (storeError) {
      console.warn("Failed to store backup codes:", storeError);
      // Don't fail the request - 2FA is still enabled
    }

    // Set the MFA verified timestamp cookie (2-hour session)
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
      message: "Two-factor authentication enabled",
      backupCodes,
    });
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify two-factor authentication" },
      { status: 500 }
    );
  }
}

/**
 * Generate random backup codes
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = Array.from({ length: 8 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(
        Math.floor(Math.random() * 32)
      )
    ).join("");
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Simple hash for backup codes (in production, use bcrypt)
 */
function hashBackupCode(code: string): string {
  // Remove dashes and convert to uppercase for comparison
  const normalized = code.replace(/-/g, "").toUpperCase();
  // Simple hash - in production use bcrypt or similar
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `h:${Math.abs(hash).toString(36)}:${normalized.slice(0, 2)}`;
}
