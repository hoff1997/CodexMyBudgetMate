import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payCycle } = await request.json();

    if (!payCycle || !["weekly", "fortnightly", "monthly"].includes(payCycle)) {
      return NextResponse.json(
        { error: "Invalid pay cycle. Must be 'weekly', 'fortnightly', or 'monthly'" },
        { status: 400 }
      );
    }

    // Update user profile with pay cycle
    const { error } = await supabase
      .from("profiles")
      .update({ pay_cycle: payCycle })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating pay cycle:", error);
      return NextResponse.json(
        { error: "Failed to update pay cycle" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, payCycle });
  } catch (error) {
    console.error("Error in pay-cycle endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
