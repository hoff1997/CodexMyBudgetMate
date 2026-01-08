import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");

  if (!childId) {
    return NextResponse.json({ error: "child_id required" }, { status: 400 });
  }

  // Get all achievement definitions
  const { data: definitions } = await supabase
    .from("kid_achievements")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("key");

  // Get child's unlocked achievements
  const { data: unlocked } = await supabase
    .from("child_achievements")
    .select("*")
    .eq("child_profile_id", childId);

  const unlockedMap = new Map(
    unlocked?.map((a) => [a.achievement_key, a.achieved_at]) || []
  );

  const achievementsWithStatus = definitions?.map((def) => ({
    ...def,
    unlocked: unlockedMap.has(def.key),
    unlocked_at: unlockedMap.get(def.key) || null,
  }));

  // Group by category
  const byCategory: Record<string, typeof achievementsWithStatus> = {};
  achievementsWithStatus?.forEach((achievement) => {
    const cat = achievement.category || "general";
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat]?.push(achievement);
  });

  return NextResponse.json({
    achievements: achievementsWithStatus,
    by_category: byCategory,
    total_unlocked: unlocked?.length || 0,
    total_available: definitions?.length || 0,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { child_id, achievement_key } = body;

  if (!child_id || !achievement_key) {
    return NextResponse.json(
      { error: "child_id and achievement_key required" },
      { status: 400 }
    );
  }

  // Verify parent ownership
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, parent_user_id")
    .eq("id", child_id)
    .single();

  if (!child || child.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Check if already unlocked
  const { data: existing } = await supabase
    .from("child_achievements")
    .select("id")
    .eq("child_profile_id", child_id)
    .eq("achievement_key", achievement_key)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already unlocked" }, { status: 400 });
  }

  // Get achievement definition (only active achievements)
  const { data: achievement } = await supabase
    .from("kid_achievements")
    .select("*")
    .eq("key", achievement_key)
    .eq("is_active", true)
    .single();

  if (!achievement) {
    return NextResponse.json(
      { error: "Achievement not found" },
      { status: 404 }
    );
  }

  // Unlock achievement
  await supabase.from("child_achievements").insert({
    child_profile_id: child_id,
    achievement_key: achievement_key,
  });

  // Note: We no longer award bonus stars as we've moved to real money focus
  // Achievements now celebrate real financial milestones

  return NextResponse.json({
    success: true,
    achievement,
  });
}
