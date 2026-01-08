import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  KidHubPermission,
  HubFeature,
  PermissionLevel,
  UpdateKidHubPermissionsRequest,
  HUB_FEATURE_LABELS,
} from "@/lib/types/kids-invoice";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

const ALL_HUB_FEATURES: HubFeature[] = [
  "shopping_lists",
  "recipes",
  "meal_planner",
  "todos",
  "calendar",
  "birthdays",
];

const DEFAULT_PERMISSIONS: Record<HubFeature, PermissionLevel> = {
  shopping_lists: "view",
  recipes: "view",
  meal_planner: "none",
  todos: "edit",
  calendar: "view",
  birthdays: "view",
};

// GET /api/kids/[childId]/hub-permissions - Get hub permissions for a child
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get existing permissions
  const { data: permissions, error } = await supabase
    .from("kid_hub_permissions")
    .select("*")
    .eq("child_profile_id", childId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Build complete permissions object with defaults for missing features
  const existingMap = new Map(
    (permissions || []).map((p) => [p.feature_name, p])
  );

  const allPermissions: Record<HubFeature, { permission: KidHubPermission | null; level: PermissionLevel }> = {} as Record<HubFeature, { permission: KidHubPermission | null; level: PermissionLevel }>;

  for (const feature of ALL_HUB_FEATURES) {
    const existing = existingMap.get(feature);
    allPermissions[feature] = {
      permission: existing || null,
      level: (existing?.permission_level as PermissionLevel) || DEFAULT_PERMISSIONS[feature],
    };
  }

  return NextResponse.json({
    childId,
    childName: child.name,
    permissions: allPermissions,
    features: ALL_HUB_FEATURES,
  });
}

// PUT /api/kids/[childId]/hub-permissions - Update hub permissions
export async function PUT(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body: UpdateKidHubPermissionsRequest = await request.json();

  if (!body.permissions || !Array.isArray(body.permissions)) {
    return NextResponse.json(
      { error: "Permissions array is required" },
      { status: 400 }
    );
  }

  // Validate permissions
  const validLevels = ["none", "view", "edit", "full"];
  for (const perm of body.permissions) {
    if (!ALL_HUB_FEATURES.includes(perm.feature_name)) {
      return NextResponse.json(
        { error: `Invalid feature: ${perm.feature_name}` },
        { status: 400 }
      );
    }
    if (!validLevels.includes(perm.permission_level)) {
      return NextResponse.json(
        { error: `Invalid permission level: ${perm.permission_level}` },
        { status: 400 }
      );
    }
  }

  // Upsert all permissions
  const results = [];
  for (const perm of body.permissions) {
    const { data, error } = await supabase
      .from("kid_hub_permissions")
      .upsert(
        {
          child_profile_id: childId,
          feature_name: perm.feature_name,
          permission_level: perm.permission_level,
        },
        {
          onConflict: "child_profile_id,feature_name",
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    results.push(data);
  }

  return NextResponse.json({
    success: true,
    updated: results.length,
    permissions: results as KidHubPermission[],
  });
}
