import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/notifications/[id] - Get a single notification
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: notification, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({ notification });
}

// PATCH /api/notifications/[id] - Update a notification (mark read/dismissed)
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { is_read, is_dismissed } = body;

  const updateData: Record<string, unknown> = {};

  if (is_read !== undefined) {
    updateData.is_read = is_read;
    if (is_read) {
      updateData.read_at = new Date().toISOString();
    }
  }

  if (is_dismissed !== undefined) {
    updateData.is_dismissed = is_dismissed;
    if (is_dismissed) {
      updateData.dismissed_at = new Date().toISOString();
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: notification, error } = await supabase
    .from("notifications")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ notification });
}

// DELETE /api/notifications/[id] - Dismiss a notification
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
