import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { seedDemoData } from "@/lib/demo/seed";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const serviceClient = createServiceClient();
    await seedDemoData(serviceClient, session.user.id, {
      fullName: session.user.user_metadata?.full_name ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to seed demo data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
