import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createClient();
  // Try to fetch 1 row from the 'envelopes' table
  const { data, error } = await supabase.from("envelopes").select("*").limit(1);
  if (error) {
    return NextResponse.json({ connected: false, error: error.message });
  }
  return NextResponse.json({ connected: true, data });
}
