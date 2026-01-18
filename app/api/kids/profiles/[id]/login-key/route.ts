import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateSecureFamilyCode } from "@/lib/utils/family-code-generator";
import { createErrorResponse } from "@/lib/utils/api-error";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET: Get the login key for a child (parent only)
 *
 * Returns the full login key for display to the parent.
 * Also logs the view for audit purposes.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id: childId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get child profile (RLS ensures parent owns this child)
    const { data: child, error } = await supabase
      .from("child_profiles")
      .select("id, name, login_key, login_key_created_at, login_key_last_used_at")
      .eq("id", childId)
      .eq("parent_user_id", user.id)
      .single();

    if (error || !child) {
      return NextResponse.json(
        { error: "Child not found or access denied" },
        { status: 404 }
      );
    }

    // Log the view (using service client for audit insert)
    const serviceClient = createServiceClient();
    await serviceClient.from("kid_login_key_audit").insert({
      child_profile_id: childId,
      parent_user_id: user.id,
      action: "viewed",
      new_key_prefix: child.login_key.substring(0, 4),
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      data: {
        childId: child.id,
        childName: child.name,
        loginKey: child.login_key,
        createdAt: child.login_key_created_at,
        lastUsedAt: child.login_key_last_used_at,
      },
    });
  } catch (err) {
    console.error("Error in GET /api/kids/profiles/[id]/login-key:", err);
    return createErrorResponse(err as Error, 500, "Failed to get login key");
  }
}

/**
 * POST: Regenerate the login key for a child (parent only)
 *
 * Creates a new unique login key, invalidating the old one.
 * The old key will no longer work for login.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: childId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify parent owns this child
    const { data: child, error: childError } = await supabase
      .from("child_profiles")
      .select("id, name, login_key")
      .eq("id", childId)
      .eq("parent_user_id", user.id)
      .single();

    if (childError || !child) {
      return NextResponse.json(
        { error: "Child not found or access denied" },
        { status: 404 }
      );
    }

    const oldKey = child.login_key;
    const serviceClient = createServiceClient();

    // Generate new unique key (loop until unique)
    let newKey: string;
    let keyExists = true;

    while (keyExists) {
      newKey = generateSecureFamilyCode();
      const { data: existing } = await serviceClient
        .from("child_profiles")
        .select("id")
        .eq("login_key", newKey)
        .single();

      keyExists = !!existing;
    }

    // Update the child's login key
    const { error: updateError } = await serviceClient
      .from("child_profiles")
      .update({
        login_key: newKey!,
        login_key_created_at: new Date().toISOString(),
      })
      .eq("id", childId);

    if (updateError) {
      console.error("Failed to update login key:", updateError);
      return NextResponse.json(
        { error: "Failed to regenerate login key" },
        { status: 500 }
      );
    }

    // Log the regeneration
    await serviceClient.from("kid_login_key_audit").insert({
      child_profile_id: childId,
      parent_user_id: user.id,
      action: "regenerated",
      old_key_prefix: oldKey.substring(0, 4),
      new_key_prefix: newKey!.substring(0, 4),
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      data: {
        childId: child.id,
        childName: child.name,
        loginKey: newKey!,
        createdAt: new Date().toISOString(),
        message: `Login key regenerated for ${child.name}. The old key will no longer work.`,
      },
    });
  } catch (err) {
    console.error("Error in POST /api/kids/profiles/[id]/login-key:", err);
    return createErrorResponse(err as Error, 500, "Failed to regenerate login key");
  }
}
