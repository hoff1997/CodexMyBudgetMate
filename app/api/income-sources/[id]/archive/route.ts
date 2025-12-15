import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const archiveSchema = z.object({
  end_date: z.string().min(1, "End date is required"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = archiveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { end_date } = parsed.data;

    // Archive the income source (soft delete - set is_active = false, set end_date)
    const { data: incomeSource, error } = await supabase
      .from("income_sources")
      .update({
        is_active: false,
        end_date,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select(`
        id,
        user_id,
        name,
        pay_cycle,
        typical_amount,
        is_active,
        next_pay_date,
        start_date,
        end_date,
        replaced_by_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error("Error archiving income source:", error);
      return NextResponse.json(
        { error: "Failed to archive income source" },
        { status: 500 }
      );
    }

    return NextResponse.json({ income: incomeSource });
  } catch (error) {
    console.error("Error in archive income source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
