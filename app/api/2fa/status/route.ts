import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/2fa/status
 *
 * Returns the current 2FA status for the authenticated user.
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

    // Get user's MFA factors
    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      console.error("MFA list factors error:", factorsError);
      return NextResponse.json(
        { error: factorsError.message || "Failed to get MFA status" },
        { status: 400 }
      );
    }

    // Check for verified TOTP factor
    const totpFactor = factorsData.totp.find((f) => f.status === "verified");
    const isEnabled = !!totpFactor;

    // Get backup codes count
    let backupCodesCount = 0;
    if (isEnabled) {
      const { data: codesData } = await supabase
        .from("user_backup_codes")
        .select("codes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (codesData?.codes) {
        backupCodesCount = codesData.codes.length;
      }
    }

    return NextResponse.json({
      isEnabled,
      factorId: totpFactor?.id ?? null,
      createdAt: totpFactor?.created_at ?? null,
      backupCodesCount,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}
