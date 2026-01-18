/**
 * Kid Session Management
 *
 * Provides secure session management for kid logins using HttpOnly cookies
 * with JWT-like tokens for session validation.
 */

import { cookies } from "next/headers";
import crypto from "crypto";

// Session configuration
const SESSION_COOKIE_NAME = "kid_session";
const SESSION_EXPIRY_HOURS = 24;

// SECURITY: No fallback secrets - KID_SESSION_SECRET must be configured
const SESSION_SECRET = process.env.KID_SESSION_SECRET;

// Validate that security secret is configured at startup
if (!SESSION_SECRET) {
  console.error(
    "[SECURITY CRITICAL] KID_SESSION_SECRET environment variable is not set! " +
    "Kid session management will NOT work. Generate a secret with: openssl rand -hex 32"
  );
}

export interface KidSession {
  childId: string;
  name: string;
  avatarUrl: string | null;
  parentUserId: string;
  starBalance: number;
  screenTimeBalance: number;
  isKidSession: true;
  createdAt: number;
  expiresAt: number;

  // Teen mode fields
  isTeenMode: boolean;
  canReconcileTransactions: boolean;
  canAddExternalIncome: boolean;
  autoGraduationDate: string | null; // ISO date of 18th birthday
}

/**
 * Create a signed session token
 * @param session - Session data to encode
 * @returns Signed token string
 * @throws Error if SESSION_SECRET is not configured
 */
function createSessionToken(session: KidSession): string {
  if (!SESSION_SECRET) {
    throw new Error(
      "KID_SESSION_SECRET must be configured. " +
      "Generate with: openssl rand -hex 32"
    );
  }

  const payload = JSON.stringify(session);
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");

  // Base64 encode the payload and append signature
  const encodedPayload = Buffer.from(payload).toString("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a session token
 * @param token - Token to verify
 * @returns Decoded session or null if invalid (fails secure if secret not configured)
 */
function verifySessionToken(token: string): KidSession | null {
  // SECURITY: Fail secure if secret is not configured
  if (!SESSION_SECRET) {
    console.error("[SECURITY] Cannot verify kid session - KID_SESSION_SECRET not configured");
    return null;
  }

  try {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) {
      return null;
    }

    // Decode the payload
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf-8");

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      return null;
    }

    const session = JSON.parse(payload) as KidSession;

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Create a kid session and return the token (for API routes that set cookie on response)
 * @param childData - Child profile data
 * @returns Object containing session data and token for cookie
 */
export function createKidSessionToken(childData: {
  id: string;
  name: string;
  avatar_url: string | null;
  parent_user_id: string;
  star_balance: number;
  screen_time_balance: number;
  // Teen mode fields (optional for backwards compatibility)
  is_teen_mode?: boolean;
  can_reconcile_transactions?: boolean;
  can_add_external_income?: boolean;
  auto_graduation_date?: string | null;
}): { session: KidSession; token: string; cookieName: string; maxAge: number } {
  const now = Date.now();
  const expiresAt = now + SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

  const session: KidSession = {
    childId: childData.id,
    name: childData.name,
    avatarUrl: childData.avatar_url,
    parentUserId: childData.parent_user_id,
    starBalance: childData.star_balance,
    screenTimeBalance: childData.screen_time_balance,
    isKidSession: true,
    createdAt: now,
    expiresAt,
    // Teen mode fields (default to false/null for non-teens)
    isTeenMode: childData.is_teen_mode ?? false,
    canReconcileTransactions: childData.can_reconcile_transactions ?? false,
    canAddExternalIncome: childData.can_add_external_income ?? false,
    autoGraduationDate: childData.auto_graduation_date ?? null,
  };

  const token = createSessionToken(session);

  return {
    session,
    token,
    cookieName: SESSION_COOKIE_NAME,
    maxAge: SESSION_EXPIRY_HOURS * 60 * 60,
  };
}

/**
 * Create a new kid session and set the cookie (for server components)
 * @param childData - Child profile data
 * @returns The created session
 */
export async function createKidSession(childData: {
  id: string;
  name: string;
  avatar_url: string | null;
  parent_user_id: string;
  star_balance: number;
  screen_time_balance: number;
  // Teen mode fields (optional for backwards compatibility)
  is_teen_mode?: boolean;
  can_reconcile_transactions?: boolean;
  can_add_external_income?: boolean;
  auto_graduation_date?: string | null;
}): Promise<KidSession> {
  const { session, token, cookieName, maxAge } = createKidSessionToken(childData);

  // Set HttpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return session;
}

/**
 * Get the current kid session from cookies
 * @returns Session data or null if not logged in or expired
 */
export async function getKidSession(): Promise<KidSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Clear the kid session (logout)
 */
export async function clearKidSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if the current kid session is valid for a specific child
 * @param childId - Child ID to verify
 * @returns True if session is valid for this child
 */
export async function validateKidSession(childId: string): Promise<boolean> {
  const session = await getKidSession();

  if (!session) {
    return false;
  }

  return session.childId === childId;
}

/**
 * Get remaining session time in seconds
 * @returns Seconds until expiry, or 0 if expired/no session
 */
export async function getSessionRemainingTime(): Promise<number> {
  const session = await getKidSession();

  if (!session) {
    return 0;
  }

  const remaining = Math.max(0, session.expiresAt - Date.now());
  return Math.floor(remaining / 1000);
}

/**
 * Refresh the kid session (extend expiry)
 * Only refreshes if session is valid and has less than half time remaining
 * @returns New session or null if refresh failed
 */
export async function refreshKidSession(): Promise<KidSession | null> {
  const session = await getKidSession();

  if (!session) {
    return null;
  }

  // Only refresh if less than half the session time remains
  const halfLife = (SESSION_EXPIRY_HOURS * 60 * 60 * 1000) / 2;
  const remaining = session.expiresAt - Date.now();

  if (remaining > halfLife) {
    return session; // No refresh needed
  }

  // Create new session with fresh expiry
  const now = Date.now();
  const expiresAt = now + SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

  const newSession: KidSession = {
    ...session,
    expiresAt,
  };

  const token = createSessionToken(newSession);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_HOURS * 60 * 60,
  });

  return newSession;
}
