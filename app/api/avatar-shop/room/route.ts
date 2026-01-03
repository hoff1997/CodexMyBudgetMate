import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");

  if (!childId) {
    return NextResponse.json({ error: "child_id required" }, { status: 400 });
  }

  // Get room layout
  const { data: room, error } = await supabase
    .from("child_room_layout")
    .select(
      `
      *,
      equipped_avatar:avatar_shop_items!equipped_avatar_id(*),
      equipped_pet:avatar_shop_items!equipped_pet_id(*)
    `
    )
    .eq("child_profile_id", childId)
    .single();

  // If no room exists, create default
  if (error && error.code === "PGRST116") {
    const { data: newRoom } = await supabase
      .from("child_room_layout")
      .insert({
        child_profile_id: childId,
        equipped_clothing_ids: [],
        room_item_placements: {},
      })
      .select()
      .single();

    return NextResponse.json({ room: newRoom });
  }

  if (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get child's inventory
  const { data: inventory } = await supabase
    .from("child_avatar_inventory")
    .select(
      `
      id,
      shop_item:avatar_shop_items(*)
    `
    )
    .eq("child_profile_id", childId);

  return NextResponse.json({
    room,
    inventory: inventory?.map((i) => i.shop_item) || [],
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { child_id, updates } = body;

  if (!child_id) {
    return NextResponse.json({ error: "child_id required" }, { status: 400 });
  }

  // Verify parent ownership
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", child_id)
    .eq("parent_user_id", user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("child_room_layout")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("child_profile_id", child_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating room:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ room: data });
}
