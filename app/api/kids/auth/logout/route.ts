import { NextResponse } from "next/server";
import { clearKidSession, getKidSession } from "@/lib/utils/kid-session";
import { createErrorResponse } from "@/lib/utils/api-error";

// POST: Log out kid session
export async function POST() {
  try {
    // Get current session to verify it exists
    const session = await getKidSession();

    if (!session) {
      return NextResponse.json(
        { message: "No active session" },
        { status: 200 }
      );
    }

    // Clear the session cookie
    await clearKidSession();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Error in POST /api/kids/auth/logout:", err);
    return createErrorResponse(err as Error, 500, "Failed to logout");
  }
}
