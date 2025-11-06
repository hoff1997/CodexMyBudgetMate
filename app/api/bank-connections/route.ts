import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: connections, error } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch bank connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank connections" },
      { status: 500 }
    );
  }

  return NextResponse.json(connections || []);
}
