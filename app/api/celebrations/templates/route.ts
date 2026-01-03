import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/celebrations/templates
 * Fetch all celebration envelope templates
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: templates, error } = await supabase
    .from("envelope_templates")
    .select("*")
    .eq("is_celebration", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[celebrations/templates] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(templates || []);
}
