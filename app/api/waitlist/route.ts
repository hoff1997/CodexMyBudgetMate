import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

// Use service role for public inserts (bypasses RLS for insert)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema
const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  source: z.string().default("website"),
  referredBy: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, name, source, referredBy } = parsed.data;

    // Generate a simple referral code for this user
    const referralCode = `MBM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Insert into waitlist
    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        source,
        referral_code: referralCode,
        referred_by: referredBy || null,
      })
      .select("id, referral_code")
      .single();

    if (error) {
      // Handle duplicate email
      if (error.code === "23505") {
        // Fetch existing referral code
        const { data: existing } = await supabase
          .from("waitlist")
          .select("referral_code")
          .eq("email", email.toLowerCase().trim())
          .single();

        return NextResponse.json({
          success: true,
          alreadyExists: true,
          message: "You're already on the list - we'll be in touch soon!",
          referralCode: existing?.referral_code,
        });
      }

      console.error("Waitlist insert error:", error);
      return NextResponse.json(
        { success: false, error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You're in! We'll email you when we launch.",
      referralCode: data.referral_code,
    });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint to check waitlist count (public info)
export async function GET() {
  try {
    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({
      count: count || 0,
    });
  } catch (err) {
    console.error("Waitlist count error:", err);
    return NextResponse.json({ count: 0 });
  }
}
