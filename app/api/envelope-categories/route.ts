import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  icon: z.string().max(10).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Try to fetch with full schema (after migration)
  const fullResult = await supabase
    .from("envelope_categories")
    .select("id, name, icon, is_system, display_order, created_at, updated_at")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  if (!fullResult.error) {
    // Full schema available - check if need to create defaults
    if (!fullResult.data || fullResult.data.length === 0) {
      try {
        await supabase.rpc("create_default_envelope_categories", { p_user_id: user.id });
        // Re-fetch after creating defaults
        const refreshed = await supabase
          .from("envelope_categories")
          .select("id, name, icon, is_system, display_order, created_at, updated_at")
          .eq("user_id", user.id)
          .order("display_order", { ascending: true });
        return NextResponse.json({ categories: refreshed.data || [] });
      } catch (err) {
        console.error("Failed to create default categories:", err);
      }
    }
    return NextResponse.json({ categories: fullResult.data || [] });
  }

  // Try minimal schema (original table without new columns)
  const minimalResult = await supabase
    .from("envelope_categories")
    .select("id, name, created_at, updated_at")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (minimalResult.error) {
    console.error("Failed to fetch envelope categories:", minimalResult.error);
    return createErrorResponse(minimalResult.error, 400, "Failed to fetch categories");
  }

  // Map minimal data to full structure with defaults
  const categories = (minimalResult.data || []).map((cat: any, index: number) => ({
    ...cat,
    icon: null,
    is_system: false,
    display_order: index,
  }));

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return createValidationError(
      parsed.error.errors.map((e) => e.message).join(", ")
    );
  }

  const { name, icon } = parsed.data;

  // Try to insert with full schema
  const fullInsert = await supabase
    .from("envelope_categories")
    .insert({
      name: name.trim(),
      icon: icon || null,
      user_id: user.id,
      is_system: false,
      display_order: 100, // High number, will be sorted
    })
    .select("id, name, icon, is_system, display_order")
    .single();

  if (!fullInsert.error) {
    return NextResponse.json({ category: fullInsert.data }, { status: 201 });
  }

  // Fallback to minimal schema
  const minimalInsert = await supabase
    .from("envelope_categories")
    .insert({
      name: name.trim(),
      user_id: user.id,
    })
    .select("id, name")
    .single();

  if (minimalInsert.error) {
    console.error("Failed to create envelope category:", minimalInsert.error);
    return createErrorResponse(minimalInsert.error, 400, "Failed to create category");
  }

  // Return with default values for missing fields
  const category = {
    ...minimalInsert.data,
    icon: null,
    is_system: false,
    display_order: 100,
  };

  return NextResponse.json({ category }, { status: 201 });
}
