import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidFamilyCodeFormat } from "@/lib/utils/family-code-generator";
import {
  checkRateLimit,
  checkGlobalIpLimit,
  recordFailedAttempt,
  recordGlobalIpAttempt,
  recordSuccessfulAttempt,
  getFamilyCodeRateLimitKey,
} from "@/lib/utils/rate-limiter";
import { validateCsrfRequest, extractCsrfToken } from "@/lib/utils/csrf";
import { createErrorResponse, createValidationError } from "@/lib/utils/api-error";

// Helper to get client IP
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

// POST: Look up children by family access code (step 1 of kid login)
export async function POST(request: NextRequest) {
  // Use service client to bypass RLS - kids aren't authenticated users
  const supabase = createServiceClient();
  const clientIP = getClientIP(request);

  try {
    const body = await request.json();
    const { familyCode, csrfToken: bodyToken } = body;

    // Validate CSRF token
    const csrfToken = extractCsrfToken(request, { csrfToken: bodyToken });
    const csrfValidation = await validateCsrfRequest(csrfToken);
    if (!csrfValidation.valid) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh and try again." },
        { status: 403 }
      );
    }

    // Validate family code format
    if (!familyCode || !isValidFamilyCodeFormat(familyCode.toUpperCase())) {
      return createValidationError("Invalid family code format");
    }

    const normalizedCode = familyCode.toUpperCase();

    // Check global IP rate limit first
    const globalCheck = await checkGlobalIpLimit(clientIP);
    if (globalCheck.isLimited) {
      const minutes = Math.ceil(globalCheck.remainingSeconds / 60);
      return NextResponse.json(
        {
          error: `Too many attempts from your network. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
          locked: true,
          remainingSeconds: globalCheck.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Check per-code rate limit
    const rateLimitKey = getFamilyCodeRateLimitKey(clientIP, normalizedCode);
    const rateLimitCheck = await checkRateLimit(rateLimitKey);

    if (rateLimitCheck.isLimited) {
      const minutes = Math.ceil(rateLimitCheck.remainingSeconds / 60);
      return NextResponse.json(
        {
          error: `Too many attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
          locked: true,
          remainingSeconds: rateLimitCheck.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Find all children with this family code
    const { data: children, error } = await supabase
      .from("child_profiles")
      .select(
        `
        id,
        name,
        avatar_url
      `
      )
      .eq("family_access_code", normalizedCode);

    if (error) {
      console.error("Error looking up family code:", error);
      await recordFailedAttempt(rateLimitKey);
      await recordGlobalIpAttempt(clientIP);
      return createErrorResponse(error, 400, "Failed to look up family code");
    }

    if (!children || children.length === 0) {
      await recordFailedAttempt(rateLimitKey);
      await recordGlobalIpAttempt(clientIP);
      return NextResponse.json(
        { error: "No children found with this family code" },
        { status: 404 }
      );
    }

    // Successful lookup - clear rate limit for this code
    await recordSuccessfulAttempt(rateLimitKey);
    // Note: Don't clear global IP here - only clear on successful PIN login

    return NextResponse.json({ data: children });
  } catch (err) {
    console.error("Error in POST /api/kids/auth/lookup:", err);
    return createErrorResponse(err as Error, 500, "Failed to process request");
  }
}
