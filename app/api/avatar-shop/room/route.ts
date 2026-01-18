import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
  createNotFoundError,
} from "@/lib/utils/api-error";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");

  if (!childId) {
    return createValidationError("child_id required");
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
    return createErrorResponse(error, 500, "Failed to fetch room");
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
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { child_id, updates } = body;

  if (!child_id) {
    return createValidationError("child_id required");
  }

  // Verify parent ownership
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", child_id)
    .eq("parent_user_id", user.id)
    .single();

  if (!child) {
    return createNotFoundError("Child");
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
    return createErrorResponse(error, 500, "Failed to update room");
  }

  return NextResponse.json({ room: data });
}
