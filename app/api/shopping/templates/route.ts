import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface TemplateItem {
  name: string;
  quantity: number;
  category_id: string | null;
  aisle_name: string | null;
}

// GET /api/shopping/templates - Fetch all templates
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: templates, error } = await supabase
    .from("shopping_list_templates")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(templates || []);
}

// POST /api/shopping/templates - Create a new template
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, icon, items, from_list_id } = body;

  // If creating from an existing list, fetch its items
  let templateItems: TemplateItem[] = items || [];

  if (from_list_id) {
    const { data: listItems, error: itemsError } = await supabase
      .from("shopping_items")
      .select("text, quantity, category_id, aisle_name")
      .eq("shopping_list_id", from_list_id);

    if (itemsError) {
      console.error("Error fetching list items:", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    templateItems = (listItems || []).map((item) => ({
      name: item.text,
      quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
      category_id: item.category_id,
      aisle_name: item.aisle_name,
    }));
  }

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: template, error } = await supabase
    .from("shopping_list_templates")
    .insert({
      parent_user_id: user.id,
      name,
      icon: icon || "🛒",
      items: templateItems,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(template, { status: 201 });
}
