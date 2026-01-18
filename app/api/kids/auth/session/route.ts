import { NextResponse } from "next/server";
import {
  getKidSession,
  getSessionRemainingTime,
  refreshKidSession,
} from "@/lib/utils/kid-session";
import { createErrorResponse } from "@/lib/utils/api-error";

// GET: Check current kid session status
export async function GET() {
  try {
    const session = await getKidSession();

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "No active session",
        },
        { status: 401 }
      );
    }

    const remainingSeconds = await getSessionRemainingTime();

    return NextResponse.json({
      authenticated: true,
      session: {
        childId: session.childId,
        name: session.name,
        avatarUrl: session.avatarUrl,
        expiresAt: session.expiresAt,
        remainingSeconds,
      },
    });
  } catch (err) {
    console.error("Error in GET /api/kids/auth/session:", err);
    return createErrorResponse(err as Error, 500, "Failed to check session");
  }
}

// POST: Refresh kid session (extend expiry)
export async function POST() {
  try {
    const newSession = await refreshKidSession();

    if (!newSession) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "No active session to refresh",
        },
        { status: 401 }
      );
    }

    const remainingSeconds = await getSessionRemainingTime();

    return NextResponse.json({
      success: true,
      session: {
        childId: newSession.childId,
        name: newSession.name,
        avatarUrl: newSession.avatarUrl,
        expiresAt: newSession.expiresAt,
        remainingSeconds,
      },
    });
  } catch (err) {
    console.error("Error in POST /api/kids/auth/session:", err);
    return createErrorResponse(err as Error, 500, "Failed to refresh session");
  }
}
