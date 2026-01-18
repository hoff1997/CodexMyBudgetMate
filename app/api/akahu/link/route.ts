import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeAkahuCode } from "@/lib/akahu/client";
import { z } from "zod";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const schema = z.object({
  code: z.string().min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return createValidationError("Missing code");
  }

  try {
    const tokens = await exchangeAkahuCode(payload.data.code);

    const { error } = await supabase.from("akahu_tokens").upsert(
      {
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return createErrorResponse(error as { message: string }, 500, "Akahu linking failed");
  }
}
