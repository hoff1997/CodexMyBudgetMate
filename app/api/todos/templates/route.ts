import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

// Pre-built todo templates
const SYSTEM_TEMPLATES = [
  {
    id: "weekly-cleaning",
    name: "Weekly Cleaning",
    icon: "🧹",
    category: "household",
    is_system: true,
    items: [
      { text: "Vacuum all rooms", category: "cleaning" },
      { text: "Mop hard floors", category: "cleaning" },
      { text: "Clean bathrooms", category: "cleaning" },
      { text: "Dust surfaces", category: "cleaning" },
      { text: "Change bed sheets", category: "cleaning" },
      { text: "Take out rubbish", category: "cleaning" },
      { text: "Clean kitchen appliances", category: "cleaning" },
    ],
  },
  {
    id: "morning-routine",
    name: "Morning Routine",
    icon: "🌅",
    category: "routine",
    is_system: true,
    items: [
      { text: "Make bed", category: "routine" },
      { text: "Have breakfast", category: "routine" },
      { text: "Brush teeth", category: "routine" },
      { text: "Get dressed", category: "routine" },
      { text: "Pack lunch", category: "routine" },
      { text: "Check calendar", category: "routine" },
    ],
  },
  {
    id: "evening-routine",
    name: "Evening Routine",
    icon: "🌙",
    category: "routine",
    is_system: true,
    items: [
      { text: "Prepare clothes for tomorrow", category: "routine" },
      { text: "Pack bags", category: "routine" },
      { text: "Quick tidy up", category: "routine" },
      { text: "Brush teeth", category: "routine" },
      { text: "Set alarm", category: "routine" },
    ],
  },
  {
    id: "moving-house",
    name: "Moving House",
    icon: "📦",
    category: "life-events",
    is_system: true,
    items: [
      { text: "Start packing non-essentials", category: "packing" },
      { text: "Book moving company", category: "logistics" },
      { text: "Update address with bank", category: "admin" },
      { text: "Update address with IRD", category: "admin" },
      { text: "Redirect mail", category: "admin" },
      { text: "Cancel/transfer utilities", category: "admin" },
      { text: "Set up new internet", category: "admin" },
      { text: "Update driver's license", category: "admin" },
      { text: "Notify employer", category: "admin" },
      { text: "Pack essentials box", category: "packing" },
      { text: "Clean old place", category: "cleaning" },
      { text: "Final walkthrough", category: "logistics" },
    ],
  },
  {
    id: "new-baby",
    name: "New Baby Prep",
    icon: "👶",
    category: "life-events",
    is_system: true,
    items: [
      { text: "Set up nursery", category: "home" },
      { text: "Buy car seat", category: "shopping" },
      { text: "Wash baby clothes", category: "home" },
      { text: "Pack hospital bag", category: "prep" },
      { text: "Install car seat", category: "prep" },
      { text: "Stock up on nappies", category: "shopping" },
      { text: "Arrange time off work", category: "admin" },
      { text: "Plan freezer meals", category: "food" },
      { text: "Set up baby monitor", category: "home" },
    ],
  },
  {
    id: "holiday-prep",
    name: "Holiday Preparation",
    icon: "✈️",
    category: "travel",
    is_system: true,
    items: [
      { text: "Check passport expiry", category: "documents" },
      { text: "Book flights", category: "booking" },
      { text: "Book accommodation", category: "booking" },
      { text: "Arrange pet care", category: "home" },
      { text: "Put mail on hold", category: "home" },
      { text: "Notify bank of travel", category: "admin" },
      { text: "Pack bags", category: "packing" },
      { text: "Print itinerary", category: "documents" },
      { text: "Charge devices", category: "packing" },
      { text: "Set out-of-office", category: "admin" },
    ],
  },
  {
    id: "party-planning",
    name: "Party Planning",
    icon: "🎉",
    category: "events",
    is_system: true,
    items: [
      { text: "Create guest list", category: "planning" },
      { text: "Send invitations", category: "planning" },
      { text: "Plan menu", category: "food" },
      { text: "Buy decorations", category: "shopping" },
      { text: "Order cake", category: "food" },
      { text: "Prepare playlist", category: "entertainment" },
      { text: "Set up decorations", category: "setup" },
      { text: "Prepare food", category: "food" },
    ],
  },
];

// GET /api/todos/templates - Fetch all templates (system + user-created)
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

  // Fetch user-created templates
  let query = supabase
    .from("todo_templates")
    .select("*")
    .eq("user_id", user.id);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: userTemplates, error } = await query;

  if (error) {
    console.error("Error fetching user templates:", error);
    return createErrorResponse(error, 500, "Failed to fetch templates");
  }

  // Combine system templates with user templates
  let allTemplates = [
    ...SYSTEM_TEMPLATES.map((t) => ({ ...t, is_system: true })),
    ...(userTemplates || []).map((t) => ({ ...t, is_system: false })),
  ];

  // Filter by category if specified
  if (category) {
    allTemplates = allTemplates.filter((t) => t.category === category);
  }

  return NextResponse.json(allTemplates);
}

// POST /api/todos/templates - Create a custom template
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { name, icon, category, items } = body;

  if (!name) {
    return createValidationError("Name is required");
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return createValidationError("Items are required");
  }

  const { data: template, error } = await supabase
    .from("todo_templates")
    .insert({
      user_id: user.id,
      name,
      icon: icon || "📝",
      category: category || "custom",
      items,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating template:", error);
    return createErrorResponse(error, 500, "Failed to create template");
  }

  return NextResponse.json(template, { status: 201 });
}
