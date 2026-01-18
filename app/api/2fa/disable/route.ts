import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

/**
 * POST /api/2fa/disable
 *
 * Disables 2FA for the user after verifying a valid TOTP code.
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
      console.error("MFA list factors error:", factorsError);
      return createErrorResponse(factorsError, 400, "Failed to get MFA factors");
    }

    // Find the TOTP factor
    const totpFactor = factorsData.totp.find((f) => f.status === "verified");

    if (!totpFactor) {
      return createValidationError("No verified TOTP factor found");
    }

    // Create a challenge and verify before disabling
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

    if (challengeError) {
      return createErrorResponse(challengeError, 400, "Failed to create challenge");
    }

    // Verify the code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return createValidationError("Invalid verification code");
    }

    // Unenroll the factor
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: totpFactor.id,
    });

    if (unenrollError) {
      console.error("MFA unenroll error:", unenrollError);
      return createErrorResponse(unenrollError, 400, "Failed to disable 2FA");
    }

    // Delete backup codes
    await supabase.from("user_backup_codes").delete().eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication disabled",
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable two-factor authentication" },
      { status: 500 }
    );
  }
}
