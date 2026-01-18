/**
 * API Error Handling Utilities
 *
 * Provides safe error handling for API routes that prevents
 * information disclosure through error messages.
 *
 * SECURITY: Database error messages can reveal schema details,
 * column names, and internal implementation details to attackers.
 */

import { NextResponse } from "next/server";

/**
 * Known safe error codes from Supabase/PostgreSQL
 * These can be exposed to clients safely
 */
const SAFE_ERROR_CODES: Record<string, string> = {
  "23505": "A record with this value already exists",
  "23503": "Cannot delete - this record is referenced elsewhere",
  "23502": "Required field is missing",
  "22P02": "Invalid data format",
  PGRST116: "Record not found",
};

/**
 * Patterns in error messages that indicate safe user-facing errors
 * vs internal/schema-revealing errors
 */
const SAFE_PATTERNS = [
  /duplicate key/i,
  /violates unique constraint/i,
  /violates foreign key constraint/i,
  /not found/i,
  /already exists/i,
];

/**
 * Patterns that indicate sensitive information that should be hidden
 */
const SENSITIVE_PATTERNS = [
  /column/i,
  /table/i,
  /relation/i,
  /schema/i,
  /index/i,
  /constraint ".*"/i,
  /function/i,
  /trigger/i,
  /policy/i,
];

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Sanitize a database error for safe client exposure
 *
 * @param error - The database error object
 * @param fallbackMessage - A generic message to use if the error is sensitive
 * @returns A sanitized error message safe for client exposure
 */
export function sanitizeDbError(
  error: DatabaseError | null | undefined,
  fallbackMessage = "An error occurred. Please try again."
): string {
  if (!error) {
    return fallbackMessage;
  }

  // Check if we have a known safe error code
  if (error.code && SAFE_ERROR_CODES[error.code]) {
    return SAFE_ERROR_CODES[error.code];
  }

  const message = error.message || "";

  // Check for sensitive patterns - if found, use fallback
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      // Log the actual error for debugging (server-side only)
      console.error("[API Error - Sanitized]", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return fallbackMessage;
    }
  }

  // Check for safe patterns - if found, we can expose a sanitized version
  for (const pattern of SAFE_PATTERNS) {
    if (pattern.test(message)) {
      if (/duplicate|already exists|unique/i.test(message)) {
        return "A record with this value already exists";
      }
      if (/foreign key|referenced/i.test(message)) {
        return "Cannot delete - this record is used elsewhere";
      }
      if (/not found/i.test(message)) {
        return "Record not found";
      }
    }
  }

  // For unknown errors, use the fallback message
  console.error("[API Error - Unknown]", {
    code: error.code,
    message: error.message,
  });
  return fallbackMessage;
}

/**
 * Create a sanitized error response
 *
 * @param error - The database error object
 * @param status - HTTP status code (default 400)
 * @param fallbackMessage - A generic message to use if the error is sensitive
 * @returns NextResponse with sanitized error
 */
export function createErrorResponse(
  error: DatabaseError | null | undefined,
  status = 400,
  fallbackMessage = "An error occurred. Please try again."
): NextResponse {
  return NextResponse.json(
    { error: sanitizeDbError(error, fallbackMessage) },
    { status }
  );
}

/**
 * Create a validation error response
 *
 * @param message - The validation error message
 * @returns NextResponse with 400 status
 */
export function createValidationError(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Create an unauthorized error response
 *
 * @returns NextResponse with 401 status
 */
export function createUnauthorizedError(): NextResponse {
  return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
}

/**
 * Create a not found error response
 *
 * @param resource - Optional resource name for the message
 * @returns NextResponse with 404 status
 */
export function createNotFoundError(resource = "Resource"): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  );
}

/**
 * Create a forbidden error response
 *
 * @returns NextResponse with 403 status
 */
export function createForbiddenError(): NextResponse {
  return NextResponse.json(
    { error: "You don't have permission to access this resource" },
    { status: 403 }
  );
}
