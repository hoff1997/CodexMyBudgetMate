import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/wishlist/[id]/convert - Convert wishlist item to Goals envelope
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the wishlist item
  const { data: wishlistItem, error: fetchError } = await supabase
    .from("wishlists")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !wishlistItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Check if already converted
  if (wishlistItem.status === "converted") {
    return NextResponse.json(
      { error: "Item has already been converted to a goal" },
      { status: 400 }
    );
  }

  // Find or create "Goals" category for user
  let { data: existingCategory } = await supabase
    .from("envelope_categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Goals")
    .maybeSingle();

  let goalsCategoryId: string;

  if (!existingCategory) {
    // Create Goals category if it doesn't exist
    const { data: newCategory, error: categoryError } = await supabase
      .from("envelope_categories")
      .insert({
        user_id: user.id,
        name: "Goals",
        icon: "🎯",
        is_system: true,
        display_order: 9,
      })
      .select()
      .single();

    if (categoryError || !newCategory) {
      console.error("Error creating Goals category:", categoryError);
      return NextResponse.json(
        { error: "Failed to create Goals category" },
        { status: 500 }
      );
    }

    goalsCategoryId = newCategory.id;
  } else {
    goalsCategoryId = existingCategory.id;
  }

  // Get the highest display order in the Goals category
  const { data: lastEnvelope } = await supabase
    .from("envelopes")
    .select("category_display_order")
    .eq("user_id", user.id)
    .eq("category_id", goalsCategoryId)
    .order("category_display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newDisplayOrder = (lastEnvelope?.category_display_order ?? -1) + 1;

  // Create envelope in Goals category
  const { data: envelope, error: envelopeError } = await supabase
    .from("envelopes")
    .insert({
      user_id: user.id,
      name: wishlistItem.name,
      icon: "🎯",
      subtype: "goal",
      priority: "discretionary",
      target_amount: wishlistItem.estimated_cost || 0,
      current_balance: 0,
      category_id: goalsCategoryId,
      category_display_order: newDisplayOrder,
      notes: wishlistItem.description || null,
    })
    .select()
    .single();

  if (envelopeError) {
    console.error("Error creating envelope:", envelopeError);
    return NextResponse.json(
      { error: "Failed to create goal envelope" },
      { status: 500 }
    );
  }

  // Update wishlist item to mark as converted
  const { data: updatedItem, error: updateError } = await supabase
    .from("wishlists")
    .update({
      status: "converted",
      converted_envelope_id: envelope.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating wishlist item:", updateError);
    // Don't fail - envelope was created successfully
  }

  return NextResponse.json({
    success: true,
    wishlistItem: updatedItem || wishlistItem,
    envelopeId: envelope.id,
    message: `"${wishlistItem.name}" has been added to your Goals!`,
  });
}
