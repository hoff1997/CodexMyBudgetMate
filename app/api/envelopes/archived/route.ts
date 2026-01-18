import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

// GET - Fetch all archived envelopes
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createUnauthorizedError();
  }

  try {
    const { data, error } = await supabase
      .from("envelopes")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", true)
      .order("archived_at", { ascending: false });

    if (error) {
      // If column doesn't exist yet, return empty array
      if (error.code === "42703") {
        return NextResponse.json({ envelopes: [] });
      }
      console.error("Failed to fetch archived envelopes:", error);
      return createErrorResponse(error, 400, "Failed to fetch archived envelopes");
    }

    return NextResponse.json({ envelopes: data || [] });
  } catch (error) {
    console.error("Archived envelopes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived envelopes" },
      { status: 500 }
    );
  }
}
