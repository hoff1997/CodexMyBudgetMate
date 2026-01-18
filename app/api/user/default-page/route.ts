import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

const schema = z.object({
  defaultPage: z.string().min(1),
});

/**
 * PATCH /api/user/default-page
 * Update user's default landing page preference
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return createValidationError("Invalid payload");
  }

  const { defaultPage } = parsed.data;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ default_page: defaultPage })
      .eq("id", user.id);

    if (error) {
      console.error("Default page update error:", error);
      return createErrorResponse(error, 400, "Failed to update default page");
    }

    return NextResponse.json({ ok: true, defaultPage });
  } catch (error: unknown) {
    console.error("Default page update error:", error);
    return createErrorResponse(error as { message: string }, 500, "Failed to update default page");
  }
}
