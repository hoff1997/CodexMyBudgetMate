import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateAkahuCache } from "@/lib/cache/akahu-cache";

/**
 * Manually invalidate Akahu cache
 * Called when user adds manual transaction or requests reconciliation
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    await invalidateAkahuCache(user.id);

    return NextResponse.json({
      success: true,
      message: "Cache invalidated successfully",
    });
  } catch (error) {
    console.error("Cache invalidation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to invalidate cache",
      },
      { status: 500 },
    );
  }
}
