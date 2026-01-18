import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

// POST - Restore archived envelope
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createUnauthorizedError();
  }

  try {
    // Restore the envelope
    const { data, error } = await supabase
      .from("envelopes")
      .update({
        is_archived: false,
        archived_at: null,
        archive_reason: null,
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to restore envelope:", error);
      return createErrorResponse(error, 400, "Failed to restore envelope");
    }

    return NextResponse.json({ envelope: data });
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: "Failed to restore envelope" },
      { status: 500 }
    );
  }
}
