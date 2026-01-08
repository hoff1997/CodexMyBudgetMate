import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/chores/templates/[id] - Get a single template
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
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
    .eq("id", id)
    .or(`is_preset.eq.true,parent_user_id.eq.${user.id}`)
    .single();

  if (error) {
    console.error("Error fetching chore template:", error);
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

// PATCH /api/chores/templates/[id] - Update a custom template
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // First verify user owns this template (can't edit preset templates)
  const { data: existing } = await supabase
    .from("chore_templates")
    .select("id, is_preset, parent_user_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Allow editing preset templates if user owns them, or their own custom ones
  if (existing.is_preset && !existing.parent_user_id) {
    return NextResponse.json(
      { error: "Cannot edit system preset templates" },
      { status: 403 }
    );
  }

  if (existing.parent_user_id && existing.parent_user_id !== user.id) {
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
    "is_expected",
    "recommended_age_min",
    "recommended_age_max",
    "currency_type",
    "currency_amount",
    "estimated_minutes",
    "max_per_week",
    "allowed_days",
    "auto_approve",
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
    .eq("id", id)
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
  const { id } = await params;
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
    .select("id, is_preset, parent_user_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Don't allow deleting system preset templates (those without a parent_user_id)
  if (existing.is_preset && !existing.parent_user_id) {
    return NextResponse.json(
      { error: "Cannot delete system templates" },
      { status: 403 }
    );
  }

  if (existing.parent_user_id && existing.parent_user_id !== user.id) {
    return NextResponse.json(
      { error: "You can only delete your own templates" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("chore_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting chore template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
