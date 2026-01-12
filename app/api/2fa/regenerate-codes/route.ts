import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/2fa/regenerate-codes
 *
 * Regenerates backup codes after verifying TOTP code.
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

    // Verify the code first
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

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);

    // Store new backup codes
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
    }

    return NextResponse.json({
      success: true,
      backupCodes,
    });
  } catch (error) {
    console.error("Regenerate codes error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}

function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Array.from({ length: 8 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(
        Math.floor(Math.random() * 32)
      )
    ).join("");
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

function hashBackupCode(code: string): string {
  const normalized = code.replace(/-/g, "").toUpperCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `h:${Math.abs(hash).toString(36)}:${normalized.slice(0, 2)}`;
}
