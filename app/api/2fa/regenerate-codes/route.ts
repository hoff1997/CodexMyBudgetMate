import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

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
      return createErrorResponse(factorsError, 400, "Failed to get MFA factors");
    }

    // Find the TOTP factor
    const totpFactor = factorsData.totp.find((f) => f.status === "verified");

    if (!totpFactor) {
      return createValidationError("No verified TOTP factor found");
    }

    // Verify the code first
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

    if (challengeError) {
      return createErrorResponse(challengeError, 400, "Failed to create challenge");
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return createValidationError("Invalid verification code");
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
