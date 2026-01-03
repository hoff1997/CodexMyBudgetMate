import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/utils/family-code-generator";

// POST: Verify PIN and create kid session (step 2 of kid login)
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { childId, pin } = body;

    // Validate inputs
    if (!childId) {
      return NextResponse.json(
        { error: "Child ID is required" },
        { status: 400 }
      );
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    // Get child profile with PIN hash
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
        screen_time_balance
      `
      )
      .eq("id", childId)
      .single();

    if (error || !child) {
      return NextResponse.json(
        { error: "Child profile not found" },
        { status: 404 }
      );
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, child.pin_hash);

    if (!isValidPin) {
      return NextResponse.json(
        { error: "Incorrect PIN" },
        { status: 401 }
      );
    }

    // Create a kid session token (stored in cookie or localStorage on client)
    // For now, we'll return a simple session object
    // In production, you'd create a JWT or use a session store
    const session = {
      childId: child.id,
      name: child.name,
      avatarUrl: child.avatar_url,
      parentUserId: child.parent_user_id,
      starBalance: child.star_balance,
      screenTimeBalance: child.screen_time_balance,
      isKidSession: true,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    // Return session data (without PIN hash)
    return NextResponse.json({
      data: {
        session,
        message: `Welcome back, ${child.name}!`,
      },
    });
  } catch (err) {
    console.error("Error in POST /api/kids/auth/login:", err);
    return NextResponse.json(
      { error: "Failed to process login" },
      { status: 500 }
    );
  }
}
