import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications - Get user's notifications
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const unreadOnly = searchParams.get("unread") === "true";
  const type = searchParams.get("type");

  // Build query
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_dismissed", false)
    .or("expires_at.is.null,expires_at.gt.now()")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  if (type) {
    query = query.eq("type", type);
  }

  const { data: notifications, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .eq("is_dismissed", false);

  return NextResponse.json({
    notifications: notifications || [],
    unread_count: unreadCount || 0,
    has_more: (notifications?.length || 0) === limit,
  });
}

// POST /api/notifications - Create a notification (internal use)
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    target_user_id,
    type,
    title,
    message,
    icon,
    priority,
    related_entity_type,
    related_entity_id,
    action_url,
    metadata,
  } = body;

  // For now, users can only send notifications to themselves
  // In future, could allow parents to send to children
  const notificationUserId = target_user_id || user.id;

  if (notificationUserId !== user.id) {
    return NextResponse.json({ error: "Cannot send notifications to other users" }, { status: 403 });
  }

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      user_id: notificationUserId,
      type: type || "system_announcement",
      title,
      message,
      icon,
      priority: priority || "medium",
      related_entity_type,
      related_entity_id,
      action_url,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ notification });
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { notification_ids, mark_all } = body;

  if (mark_all) {
    // Mark all as read
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, marked_all: true });
  }

  if (!notification_ids || !Array.isArray(notification_ids)) {
    return NextResponse.json({ error: "notification_ids required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .in("id", notification_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, marked_count: notification_ids.length });
}
