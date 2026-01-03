import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: { id: string };
}

// GET /api/chores/templates/[id] - Get a single template
export async function GET(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: template, error } = await supabase
    .from("chore_templates")
    .select("*")
    .eq("id", params.id)
    .or(`is_system.eq.true,created_by.eq.${user.id}`)
    .single();

  if (error) {
    console.error("Error fetching chore template:", error);
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

// PATCH /api/chores/templates/[id] - Update a custom template
export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // First verify user owns this template (can't edit system templates)
  const { data: existing } = await supabase
    .from("chore_templates")
    .select("id, is_system, created_by")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (existing.is_system) {
    return NextResponse.json(
      { error: "Cannot edit system templates" },
      { status: 403 }
    );
  }

  if (existing.created_by !== user.id) {
    return NextResponse.json(
      { error: "You can only edit your own templates" },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Only allow certain fields to be updated
  const allowedFields = [
    "name",
    "description",
    "icon",
    "category",
    "recommended_age_min",
    "recommended_age_max",
    "default_currency_type",
    "default_currency_amount",
    "estimated_minutes",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data: template, error } = await supabase
    .from("chore_templates")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating chore template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(template);
}

// DELETE /api/chores/templates/[id] - Delete a custom template
export async function DELETE(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // First verify user owns this template
  const { data: existing } = await supabase
    .from("chore_templates")
    .select("id, is_system, created_by")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (existing.is_system) {
    return NextResponse.json(
      { error: "Cannot delete system templates" },
      { status: 403 }
    );
  }

  if (existing.created_by !== user.id) {
    return NextResponse.json(
      { error: "You can only delete your own templates" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("chore_templates")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("Error deleting chore template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
