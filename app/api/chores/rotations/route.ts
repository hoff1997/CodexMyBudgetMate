import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/chores/rotations - List chore rotations for this parent
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active_only") === "true";

  let query = supabase
    .from("chore_rotations")
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        icon,
        category
      ),
      rotation_members:chore_rotation_members (
        id,
        child_profile_id,
        order_position,
        child:child_profiles (
          id,
          name,
          avatar_url
        )
      )
    `
    )
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data: rotations, error } = await query;

  if (error) {
    console.error("Error fetching chore rotations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(rotations);
}

// POST /api/chores/rotations - Create a new rotation
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const {
    chore_template_id,
    name,
    frequency,
    day_of_week,
    currency_type,
    currency_amount,
    child_ids,
  } = body;

  // Required fields
  if (!chore_template_id || !frequency) {
    return NextResponse.json(
      { error: "chore_template_id and frequency are required" },
      { status: 400 }
    );
  }

  if (!child_ids || !Array.isArray(child_ids) || child_ids.length === 0) {
    return NextResponse.json(
      { error: "At least one child is required for rotation" },
      { status: 400 }
    );
  }

  // Verify parent owns all these children
  const { data: children } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("parent_user_id", user.id)
    .in("id", child_ids);

  if (!children || children.length !== child_ids.length) {
    return NextResponse.json(
      { error: "Some children not found or don't belong to you" },
      { status: 400 }
    );
  }

  // Get template for defaults
  const { data: template } = await supabase
    .from("chore_templates")
    .select("default_currency_type, default_currency_amount, name")
    .eq("id", chore_template_id)
    .single();

  if (!template) {
    return NextResponse.json({ error: "Chore template not found" }, { status: 404 });
  }

  // Create the rotation
  const { data: rotation, error: rotationError } = await supabase
    .from("chore_rotations")
    .insert({
      parent_user_id: user.id,
      chore_template_id,
      name: name || template.name,
      frequency,
      day_of_week: day_of_week ?? null,
      currency_type: currency_type || template.default_currency_type,
      currency_amount: currency_amount ?? template.default_currency_amount,
      current_child_index: 0,
      is_active: true,
    })
    .select()
    .single();

  if (rotationError) {
    console.error("Error creating chore rotation:", rotationError);
    return NextResponse.json({ error: rotationError.message }, { status: 500 });
  }

  // Add rotation members
  const members = child_ids.map((childId: string, index: number) => ({
    rotation_id: rotation.id,
    child_profile_id: childId,
    order_position: index,
  }));

  const { error: membersError } = await supabase
    .from("chore_rotation_members")
    .insert(members);

  if (membersError) {
    console.error("Error adding rotation members:", membersError);
    // Try to clean up the rotation
    await supabase.from("chore_rotations").delete().eq("id", rotation.id);
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  // Return full rotation with members
  const { data: fullRotation } = await supabase
    .from("chore_rotations")
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        icon
      ),
      rotation_members:chore_rotation_members (
        id,
        child_profile_id,
        order_position,
        child:child_profiles (
          id,
          name,
          avatar_url
        )
      )
    `
    )
    .eq("id", rotation.id)
    .single();

  return NextResponse.json(fullRotation, { status: 201 });
}
