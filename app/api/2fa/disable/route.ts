import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      console.error("MFA list factors error:", factorsError);
      return NextResponse.json(
        { error: factorsError.message || "Failed to get MFA factors" },
        { status: 400 }
      );
    }

    // Find the TOTP factor
    const totpFactor = factorsData.totp.find((f) => f.status === "verified");

    if (!totpFactor) {
      return NextResponse.json(
        { error: "No verified TOTP factor found" },
        { status: 400 }
      );
    }

    // Create a challenge and verify before disabling
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

    if (challengeError) {
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
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Unenroll the factor
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: totpFactor.id,
    });

    if (unenrollError) {
      console.error("MFA unenroll error:", unenrollError);
      return NextResponse.json(
        { error: unenrollError.message || "Failed to disable 2FA" },
        { status: 400 }
      );
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
