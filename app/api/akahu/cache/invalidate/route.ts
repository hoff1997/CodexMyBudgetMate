import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateAkahuCache } from "@/lib/cache/akahu-cache";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

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
    return createUnauthorizedError();
  }

  try {
    await invalidateAkahuCache(user.id);

    return NextResponse.json({
      success: true,
      message: "Cache invalidated successfully",
    });
  } catch (error) {
    console.error("Cache invalidation error:", error);
    return createErrorResponse(error as { message: string }, 500, "Failed to invalidate cache");
  }
}
