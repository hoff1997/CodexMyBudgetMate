import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { akahuRequest } from "@/lib/akahu/client";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: token } = await supabase
    .from("akahu_tokens")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!token) {
    return NextResponse.json({ error: "No Akahu connection" }, { status: 404 });
  }

  try {
    const payload = await akahuRequest<{ items: unknown[] }>({
      endpoint: "/transactions",
      accessToken: token.access_token,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Akahu request failed" },
      { status: 500 },
    );
  }
}
