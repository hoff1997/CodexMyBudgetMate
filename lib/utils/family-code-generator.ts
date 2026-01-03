// Family Access Code Generator for My Budget Mate Kids

/**
 * Generate a unique family access code
 * Format: PREFIX-YEAR (e.g., "HOFF-2026")
 *
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
 * Generate a family access code with a random suffix for uniqueness
 * Format: PREFIX-YEAR-XXX (e.g., "HOFF-2026-A7B")
 *
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
 * Validate a family access code format
 * @param code - The code to validate
 * @returns True if the code matches expected format
 */
export function isValidFamilyCodeFormat(code: string): boolean {
  // Basic format: XXXX-YYYY or XXXX-YYYY-XXX
  const basicPattern = /^[A-Z]{4}-\d{4}$/;
  const uniquePattern = /^[A-Z]{4}-\d{4}-[A-Z0-9]{3}$/;

  return basicPattern.test(code) || uniquePattern.test(code);
}

/**
 * Hash a 4-digit PIN for secure storage
 * Uses a simple hash for now - in production, use bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  // Validate PIN is 4 digits
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }

  // Use SubtleCrypto for hashing (browser and Node.js compatible)
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Verify a PIN against a stored hash
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  try {
    const inputHash = await hashPin(pin);
    return inputHash === storedHash;
  } catch {
    return false;
  }
}
