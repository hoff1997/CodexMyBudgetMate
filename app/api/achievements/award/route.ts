import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getAchievement } from "@/lib/gamification/achievements";

const schema = z.object({
  achievementKey: z.string(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/achievements/award
 * Award an achievement to the current user
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error },
      { status: 400 }
    );
  }

  const { achievementKey, metadata } = parsed.data;

  // Validate achievement exists
  const achievement = getAchievement(achievementKey);
  if (!achievement) {
    return NextResponse.json(
      { error: "Achievement not found" },
      { status: 404 }
    );
  }

  try {
    // Award achievement using database function
    const { data, error } = await supabase.rpc('award_achievement', {
      p_user_id: session.user.id,
      p_achievement_key: achievementKey,
      p_category: achievement.category,
      p_points: achievement.points,
      p_metadata: metadata || {},
    });

    if (error) {
      console.error('Award achievement error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // data is a boolean: true if newly earned, false if already earned
    const newlyEarned = data === true;

    if (newlyEarned) {
      // Update last activity
      await supabase
        .from('profiles')
        .update({
          last_activity_context: {
            action: 'achievement_earned',
            timestamp: new Date().toISOString(),
            achievementKey,
          },
        })
        .eq('user_id', session.user.id);
    }

    return NextResponse.json({
      ok: true,
      newlyEarned,
      achievement: {
        key: achievementKey,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        points: achievement.points,
        category: achievement.category,
      },
    });
  } catch (error: any) {
    console.error('Achievement award error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
