import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { z } from "zod";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Use service role for public inserts (bypasses RLS for insert)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiter: 5 requests per 10 minutes per IP
let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "waitlist",
  });
}

// Validation schema
const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Please enter your name"),
  source: z.string().default("website"),
  referredBy: z.string().optional(),
  turnstileToken: z.string().optional(),
});

// Verify Cloudflare Turnstile token
async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Skip verification if not configured

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = await res.json();
  return data.success === true;
}

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    if (ratelimit) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || "unknown";
      const { success: allowed } = await ratelimit.limit(ip);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Too many requests. Please try again in a few minutes." },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, name, source, referredBy, turnstileToken } = parsed.data;

    // Verify Turnstile if configured and token provided
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return NextResponse.json(
          { success: false, error: "Please complete the verification challenge." },
          { status: 400 }
        );
      }
      const valid = await verifyTurnstile(turnstileToken);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: "Verification failed. Please try again." },
          { status: 400 }
        );
      }
    }

    // Generate a simple referral code for this user
    const referralCode = `MBM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Insert into waitlist
    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        source,
        referral_code: referralCode,
        referred_by: referredBy || null,
      })
      .select("id, referral_code")
      .single();

    if (error) {
      // Handle duplicate email
      if (error.code === "23505") {
        return NextResponse.json({
          success: true,
          alreadyExists: true,
          message: "You're already on the list - we'll be in touch soon!",
        });
      }

      console.error("Waitlist insert error:", error);
      return NextResponse.json(
        { success: false, error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    // Send notification email (non-blocking)
    if (resend && process.env.NOTIFICATION_EMAIL) {
      resend.emails
        .send({
          from: "My Budget Mate <notifications@mybudgetmate.co.nz>",
          to: process.env.NOTIFICATION_EMAIL,
          subject: `New waitlist signup: ${email.toLowerCase().trim()}`,
          html: `
            <h2>New Waitlist Signup</h2>
            <p><strong>Email:</strong> ${email.toLowerCase().trim()}</p>
            <p><strong>Name:</strong> ${name.trim()}</p>
            <p><strong>Source:</strong> ${source}</p>
            <p><strong>Referral Code:</strong> ${data.referral_code}</p>
            ${referredBy ? `<p><strong>Referred By:</strong> ${referredBy}</p>` : ""}
            <p><strong>Time:</strong> ${new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}</p>
          `,
        })
        .catch((err) => console.error("Notification email failed:", err));
    }

    return NextResponse.json({
      success: true,
      message: "You're in! We'll email you when we launch.",
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
