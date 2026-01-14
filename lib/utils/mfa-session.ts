/**
 * MFA Session Management
 *
 * Akahu accreditation requires web apps to expire MFA status after 2 hours.
 * This module tracks when MFA was last verified and enforces re-verification.
 */

// MFA session timeout in milliseconds (2 hours as required by Akahu)
export const MFA_SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

// Cookie name for MFA verification timestamp
export const MFA_VERIFIED_COOKIE = "mfa_verified_at";

/**
 * Check if MFA session is still fresh (within 2 hours)
 * @param verifiedAt - Timestamp when MFA was last verified
 * @returns true if MFA session is fresh, false if expired
 */
export function isMfaSessionFresh(verifiedAt: number | null): boolean {
  if (!verifiedAt) return false;
  const now = Date.now();
  return now - verifiedAt < MFA_SESSION_TIMEOUT_MS;
}

/**
 * Calculate time remaining in MFA session
 * @param verifiedAt - Timestamp when MFA was last verified
 * @returns Time remaining in milliseconds, or 0 if expired
 */
export function getMfaSessionTimeRemaining(verifiedAt: number | null): number {
  if (!verifiedAt) return 0;
  const expiresAt = verifiedAt + MFA_SESSION_TIMEOUT_MS;
  const remaining = expiresAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format time remaining for display
 * @param ms - Milliseconds remaining
 * @returns Formatted string like "1h 30m" or "45m"
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expired";

  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Parse MFA verified timestamp from cookie value
 * @param cookieValue - The cookie value (timestamp as string)
 * @returns Parsed timestamp or null if invalid
 */
export function parseMfaVerifiedCookie(cookieValue: string | undefined): number | null {
  if (!cookieValue) return null;
  const timestamp = parseInt(cookieValue, 10);
  if (isNaN(timestamp)) return null;
  return timestamp;
}

/**
 * Routes that require fresh MFA verification (bank-related operations)
 * These routes will prompt for MFA re-verification if session has expired
 */
export const MFA_PROTECTED_ROUTES = [
  "/api/akahu",
  "/settings/bank",
  "/settings/security",
  "/api/bank",
];

/**
 * Check if a route requires fresh MFA
 * @param pathname - The route pathname
 * @returns true if route requires fresh MFA
 */
export function routeRequiresFreshMfa(pathname: string): boolean {
  return MFA_PROTECTED_ROUTES.some(
    (route) => pathname.startsWith(route)
  );
}
