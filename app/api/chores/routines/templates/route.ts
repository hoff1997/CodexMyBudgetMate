import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

// GET /api/chores/routines/templates - Get system routine templates
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const timeOfDay = searchParams.get("time_of_day");

  let query = supabase
    .from("system_routine_templates")
    .select("*")
    .order("name");

  if (category) {
    query = query.eq("category", category);
  }

  if (timeOfDay) {
    query = query.eq("time_of_day", timeOfDay);
  }

  const { data: templates, error } = await query;

  if (error) {
    console.error("Error fetching system routine templates:", error);
    return createErrorResponse(error, 500, "Failed to fetch system routine templates");
  }

  return NextResponse.json(templates);
}

// POST /api/chores/routines/templates - Create a routine from a system template
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { template_id, name_override } = body;

  if (!template_id) {
    return createValidationError("template_id is required");
  }

  // Get the system template
  const { data: template, error: templateError } = await supabase
    .from("system_routine_templates")
    .select("*")
    .eq("id", template_id)
    .single();

  if (templateError || !template) {
    return createNotFoundError("Template");
  }

  // Find or create chore templates for each chore name
  const choreNames: string[] = template.chore_names;
  const choreTemplateIds: string[] = [];

  for (const choreName of choreNames) {
    // First check if a matching chore template exists
    const { data: existingTemplate } = await supabase
      .from("chore_templates")
      .select("id")
      .ilike("name", choreName)
      .or(`is_system.eq.true,created_by.eq.${user.id}`)
      .limit(1)
      .single();

    if (existingTemplate) {
      choreTemplateIds.push(existingTemplate.id);
    } else {
      // Create a new custom chore template
      const { data: newTemplate, error: createError } = await supabase
        .from("chore_templates")
        .insert({
          name: choreName,
          description: null,
          icon: "📋",
          category: template.category,
          default_currency_type: "stars",
          default_currency_amount: 1,
          is_system: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating chore template:", createError);
        continue;
      }

      choreTemplateIds.push(newTemplate.id);
    }
  }

  // Create the routine
  const { data: routine, error: routineError } = await supabase
    .from("chore_routines")
    .insert({
      parent_user_id: user.id,
      name: name_override || template.name,
      description: template.description,
      icon: template.icon,
      time_of_day: template.time_of_day,
      is_active: true,
      sort_order: 0,
    })
    .select()
    .single();

  if (routineError) {
    console.error("Error creating routine:", routineError);
    return createErrorResponse(routineError, 500, "Failed to create routine");
  }

  // Add routine items
  const routineItems = choreTemplateIds.map((templateId, index) => ({
    routine_id: routine.id,
    chore_template_id: templateId,
    sort_order: index,
    is_required: true,
  }));

  const { error: itemsError } = await supabase
    .from("chore_routine_items")
    .insert(routineItems);

  if (itemsError) {
    console.error("Error adding routine items:", itemsError);
    // Clean up
    await supabase.from("chore_routines").delete().eq("id", routine.id);
    return createErrorResponse(itemsError, 500, "Failed to add routine items");
  }

  // Return full routine with items
  const { data: fullRoutine } = await supabase
    .from("chore_routines")
    .select(
      `
      *,
      items:chore_routine_items (
        id,
        chore_template_id,
        sort_order,
        is_required,
        chore_template:chore_templates (
          id,
          name,
          icon
        )
      )
    `
    )
    .eq("id", routine.id)
    .single();

  return NextResponse.json(fullRoutine, { status: 201 });
}
