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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    // Insert achievement directly into the table
    // Uses upsert to handle duplicates gracefully (unique constraint on user_id, achievement_type)
    const { data, error } = await supabase
      .from('achievements')
      .upsert(
        {
          user_id: user.id,
          achievement_type: achievementKey,
          metadata: metadata || {},
          unlocked_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,achievement_type',
          ignoreDuplicates: true,
        }
      )
      .select()
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (duplicate was ignored)
      console.error('Award achievement error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If data exists, it was newly earned; if null/error, it was a duplicate
    const newlyEarned = !!data;

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
        .eq('id', user.id);
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
