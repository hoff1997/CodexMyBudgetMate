import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google-calendar";
import { createUnauthorizedError } from "@/lib/utils/api-error";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  try {
    const authUrl = await getAuthUrl();
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Failed to generate auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
