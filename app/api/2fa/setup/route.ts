import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/2fa/setup
 *
 * Initiates TOTP 2FA setup using Supabase's native MFA support.
 * Returns the QR code for the user to scan with their authenticator app.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enroll the user in TOTP MFA
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "My Budget Mate Authenticator",
    });

    if (error) {
      console.error("MFA enroll error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to setup 2FA" },
        { status: 400 }
      );
    }

    // data contains: id (factor id), totp (contains qr_code and secret)
    return NextResponse.json({
      factorId: data.id,
      qrCodeDataUrl: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup two-factor authentication" },
      { status: 500 }
    );
  }
}
