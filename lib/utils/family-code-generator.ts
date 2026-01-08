// Family Access Code Generator for My Budget Mate Kids
import bcrypt from "bcrypt";
import * as crypto from "crypto";

// Salt rounds for bcrypt (10 is a good balance of security and performance)
const SALT_ROUNDS = 10;

/**
 * Generate a unique family access code (LEGACY - less secure)
 * Format: PREFIX-YEAR (e.g., "HOFF-2026")
 *
 * @deprecated Use generateSecureFamilyCode instead for new accounts
 * @param parentName - The parent's name or username
 * @returns A formatted family access code
 */
export function generateFamilyAccessCode(parentName: string): string {
  // Clean the name: remove spaces, special chars, take first 4 chars
  const cleanName = parentName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase();

  // Pad with X if name is too short
  const prefix = cleanName.padEnd(4, "X");

  const year = new Date().getFullYear();

  return `${prefix}-${year}`;
}

/**
 * Generate a family access code with a random suffix for uniqueness (LEGACY)
 * Format: PREFIX-YEAR-XXX (e.g., "HOFF-2026-A7B")
 *
 * @deprecated Use generateSecureFamilyCode instead for new accounts
 * @param parentName - The parent's name or username
 * @returns A formatted family access code with random suffix
 */
export function generateUniqueFamilyAccessCode(parentName: string): string {
  const baseCode = generateFamilyAccessCode(parentName);

  // Add a 3-character alphanumeric suffix for uniqueness
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${baseCode}-${suffix}`;
}

/**
 * Generate a highly secure family access code
 * Format: XXXX-XXXX-XXXX (e.g., "K7M2-P9QR-3WNX")
 *
 * This provides ~61 bits of entropy (36^12 / 3 groups = 4.7e18 combinations)
 * Even at 1000 guesses/second, would take ~150,000 years to brute force
 *
 * @returns A cryptographically secure family access code
 */
export function generateSecureFamilyCode(): string {
  // Use only uppercase letters and numbers, excluding confusing chars (0/O, 1/I/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const randomBytes = crypto.randomBytes(12);

  let code = "";
  for (let i = 0; i < 12; i++) {
    // Use modulo to map random byte to character set
    code += chars[randomBytes[i] % chars.length];
    // Add dash after every 4 characters (except at the end)
    if ((i + 1) % 4 === 0 && i < 11) {
      code += "-";
    }
  }

  return code;
}

/**
 * Validate a family access code format
 * Supports both legacy and new secure formats
 * @param code - The code to validate
 * @returns True if the code matches expected format
 */
export function isValidFamilyCodeFormat(code: string): boolean {
  // Legacy format: XXXX-YYYY (4 letters, dash, 4 digits)
  const legacyBasicPattern = /^[A-Z]{4}-\d{4}$/;
  // Legacy format with suffix: XXXX-YYYY-XXX (4 letters, dash, 4 digits, dash, 3 alphanum)
  const legacyUniquePattern = /^[A-Z]{4}-\d{4}-[A-Z0-9]{3}$/;
  // New secure format: XXXX-XXXX-XXXX (3 groups of 4 alphanumeric)
  const securePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  return (
    legacyBasicPattern.test(code) ||
    legacyUniquePattern.test(code) ||
    securePattern.test(code)
  );
}

/**
 * Check if a family code is the new secure format
 * @param code - The code to check
 * @returns True if new secure format
 */
export function isSecureFamilyCode(code: string): boolean {
  const securePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return securePattern.test(code);
}

/**
 * Hash a 4-digit PIN for secure storage using bcrypt
 * @param pin - 4-digit PIN
 * @returns Bcrypt hash of the PIN
 */
export async function hashPin(pin: string): Promise<string> {
  // Validate PIN is 4 digits
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }

  // Use bcrypt with salt for secure hashing
  const hash = await bcrypt.hash(pin, SALT_ROUNDS);
  return hash;
}

/**
 * Verify a PIN against a stored bcrypt hash
 * @param pin - Plain text PIN to verify
 * @param storedHash - Stored bcrypt hash
 * @returns True if PIN matches
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  // Validate PIN format
  if (!/^\d{4}$/.test(pin)) {
    return false;
  }

  // Handle legacy SHA-256 hashes (64 char hex string)
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars
  if (storedHash.length === 64 && /^[a-f0-9]+$/.test(storedHash)) {
    // Legacy SHA-256 hash - verify using old method
    return await verifyLegacyPin(pin, storedHash);
  }

  try {
    const isValid = await bcrypt.compare(pin, storedHash);
    return isValid;
  } catch {
    return false;
  }
}

/**
 * Legacy PIN verification using SHA-256 (for backwards compatibility)
 * @deprecated Will be removed once all PINs are migrated to bcrypt
 */
async function verifyLegacyPin(pin: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex === storedHash;
  } catch {
    return false;
  }
}

/**
 * Check if a hash is the legacy SHA-256 format
 * @param hash - Hash to check
 * @returns True if legacy format
 */
export function isLegacyPinHash(hash: string): boolean {
  return hash.length === 64 && /^[a-f0-9]+$/.test(hash);
}
