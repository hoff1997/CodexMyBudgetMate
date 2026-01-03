import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET all templates for the user
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("meal_plan_templates")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ templates: data });
}

// POST create a new template
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name) {
    return NextResponse.json(
      { error: "Template name is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meal_plan_templates")
    .insert({
      parent_user_id: user.id,
      name: body.name,
      cycle_type: body.cycle_type || "weekly",
      template_data: body.template_data || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ template: data });
}
