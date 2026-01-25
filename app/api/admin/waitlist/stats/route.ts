import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    // Get today's signups
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    // Get this week's signups
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: weekCount } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    // Get signups by source
    const { data: sourceData } = await supabase.from("waitlist").select("source");

    const sourceCounts: Record<string, number> = {};
    sourceData?.forEach((entry) => {
      const src = entry.source || "unknown";
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    // Get recent signups (last 10)
    const { data: recentSignups } = await supabase
      .from("waitlist")
      .select("id, email, name, source, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Get daily signups for last 14 days (for chart)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: dailyData } = await supabase
      .from("waitlist")
      .select("created_at")
      .gte("created_at", twoWeeksAgo.toISOString())
      .order("created_at", { ascending: true });

    // Group by day
    const dailyCounts: Record<string, number> = {};
    dailyData?.forEach((entry) => {
      const date = new Date(entry.created_at).toISOString().split("T")[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // Fill in missing days with 0
    const dailyChartData = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyChartData.push({
        date: dateStr,
        count: dailyCounts[dateStr] || 0,
      });
    }

    return NextResponse.json({
      total: totalCount || 0,
      today: todayCount || 0,
      thisWeek: weekCount || 0,
      bySource: sourceCounts,
      recentSignups: recentSignups || [],
      dailyChart: dailyChartData,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
