import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { seedDemoData } from "@/lib/demo/seed";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);

    const serviceClient = createServiceClient();
    await seedDemoData(serviceClient, user.id, {
      fullName: user.user_metadata?.full_name ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Seed error:', error);
    const message = error instanceof Error ? error.message : "Unable to seed demo data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
