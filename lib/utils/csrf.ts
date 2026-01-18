/**
 * CSRF Protection for Kids Login
 *
 * Generates and validates CSRF tokens to prevent cross-site request forgery.
 * Uses HMAC-SHA256 with a server secret for token generation.
 */

import * as crypto from "crypto";
import { cookies } from "next/headers";

// SECURITY: No fallback secrets - these must be configured in environment
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.KID_SESSION_SECRET;

// Validate that security secrets are configured at startup
if (!CSRF_SECRET) {
  console.error(
    "[SECURITY CRITICAL] Neither CSRF_SECRET nor KID_SESSION_SECRET environment variable is set! " +
    "CSRF protection will NOT work. Generate a secret with: openssl rand -hex 32"
  );
}

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

interface CsrfToken {
  token: string;
  timestamp: number;
}

/**
 * Generate a CSRF token
 * @throws Error if CSRF_SECRET is not configured
 */
function generateToken(): string {
  if (!CSRF_SECRET) {
    throw new Error(
      "CSRF_SECRET or KID_SESSION_SECRET must be configured. " +
      "Generate with: openssl rand -hex 32"
    );
  }

  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const payload = `${timestamp}.${randomBytes}`;

  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

/**
 * Validate a CSRF token
 * Returns false if secret is not configured (fail secure)
 */
function validateToken(token: string): boolean {
  // SECURITY: Fail secure if secret is not configured
  if (!CSRF_SECRET) {
    console.error("[SECURITY] Cannot validate CSRF token - secret not configured");
    return false;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [timestamp, randomBytes, signature] = parts;
    const payload = `${timestamp}.${randomBytes}`;

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", CSRF_SECRET)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) return false;

    // Check expiry
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime)) return false;
    if (Date.now() - tokenTime > TOKEN_EXPIRY) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Set CSRF cookie and return token value
 * Call this from API routes that serve forms
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TOKEN_EXPIRY / 1000, // seconds
    path: "/",
  });

  return token;
}

/**
 * Get current CSRF token from cookie (for forms to include in hidden field)
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Validate CSRF token from request
 * Checks both cookie and header/body match
 */
export async function validateCsrfRequest(
  headerOrBodyToken: string | null
): Promise<{ valid: boolean; error?: string }> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return { valid: false, error: "Missing CSRF cookie" };
  }

  if (!headerOrBodyToken) {
    return { valid: false, error: "Missing CSRF token in request" };
  }

  // Tokens must match
  if (cookieToken !== headerOrBodyToken) {
    return { valid: false, error: "CSRF token mismatch" };
  }

  // Validate token integrity and expiry
  if (!validateToken(cookieToken)) {
    return { valid: false, error: "Invalid or expired CSRF token" };
  }

  return { valid: true };
}

/**
 * Extract CSRF token from request (header or body)
 */
export function extractCsrfToken(request: Request, body?: { csrfToken?: string }): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) return headerToken;

  // Check body
  if (body?.csrfToken) return body.csrfToken;

  return null;
}
