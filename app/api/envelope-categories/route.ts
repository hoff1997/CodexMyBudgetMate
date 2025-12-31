import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: categories, error } = await supabase
    .from("envelope_categories")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch envelope categories:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Return categories for frontend
  const transformedCategories = (categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
  }));

  return NextResponse.json({ categories: transformedCategories });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { name } = parsed.data;

  const { data: category, error } = await supabase
    .from("envelope_categories")
    .insert({
      name,
      user_id: user.id,
    })
    .select("id, name")
    .single();

  if (error) {
    console.error("Failed to create envelope category:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    category: { id: category.id, name: category.name }
  }, { status: 201 });
}
