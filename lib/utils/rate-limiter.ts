/**
 * Rate Limiter for Kids PIN Login
 *
 * Security features:
 * - Per-target rate limiting (IP + childId/familyCode)
 * - Global IP-based rate limiting (prevents distributed attacks)
 * - Exponential backoff (1 min, 2 min, 5 min, 15 min, 30 min)
 * - Database persistence (survives server restarts)
 * - In-memory fallback for performance
 */

import { createClient } from "@/lib/supabase/server";

interface RateLimitEntry {
  attempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

// In-memory store (primary for performance, backed by database)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Global IP rate limiting store (separate from per-target)
const globalIpStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_ATTEMPTS = 5;
const GLOBAL_IP_MAX_ATTEMPTS = 20; // Max attempts from single IP across all targets
const LOCKOUT_MINUTES = [1, 2, 5, 15, 30]; // Escalating lockout periods
const GLOBAL_LOCKOUT_MINUTES = [5, 15, 30, 60, 120]; // Stricter for IP-wide abuse
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes
const ENTRY_TTL = 30 * 60 * 1000; // Entries expire after 30 minutes of inactivity
const DB_SYNC_INTERVAL = 60 * 1000; // Sync to database every minute

// Track when we last synced to database
let lastDbSync = 0;

// Cleanup old entries periodically
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.lastAttempt > ENTRY_TTL) {
        rateLimitStore.delete(key);
      }
    }
    for (const [key, entry] of globalIpStore.entries()) {
      if (now - entry.lastAttempt > ENTRY_TTL) {
        globalIpStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

startCleanup();

/**
 * Sync rate limit data to database for persistence
 */
async function syncToDatabase(key: string, entry: RateLimitEntry): Promise<void> {
  const now = Date.now();
  // Only sync periodically to avoid hammering the database
  if (now - lastDbSync < DB_SYNC_INTERVAL) return;

  try {
    const supabase = await createClient();
    await supabase.from("rate_limit_entries").upsert(
      {
        key,
        attempts: entry.attempts,
        locked_until: entry.lockedUntil ? new Date(entry.lockedUntil).toISOString() : null,
        last_attempt: new Date(entry.lastAttempt).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    lastDbSync = now;
  } catch (err) {
    // Silently fail - in-memory is still working
    console.error("Failed to sync rate limit to database:", err);
  }
}

/**
 * Load rate limit entry from database (on cold start)
 */
async function loadFromDatabase(key: string): Promise<RateLimitEntry | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rate_limit_entries")
      .select("attempts, locked_until, last_attempt")
      .eq("key", key)
      .single();

    if (!data) return null;

    return {
      attempts: data.attempts,
      lockedUntil: data.locked_until ? new Date(data.locked_until).getTime() : null,
      lastAttempt: new Date(data.last_attempt).getTime(),
    };
  } catch {
    return null;
  }
}

/**
 * Get or create rate limit entry (checks database on miss)
 */
async function getEntry(key: string, store: Map<string, RateLimitEntry>): Promise<RateLimitEntry | null> {
  let entry = store.get(key);

  if (!entry) {
    // Try loading from database
    entry = (await loadFromDatabase(key)) || undefined;
    if (entry) {
      store.set(key, entry);
    }
  }

  return entry || null;
}

/**
 * Check global IP rate limit (prevents distributed attacks)
 */
export async function checkGlobalIpLimit(ip: string): Promise<{
  isLimited: boolean;
  remainingSeconds: number;
}> {
  if (!ip || ip === "unknown") {
    return { isLimited: false, remainingSeconds: 0 };
  }

  const key = `global_ip_${ip}`;
  const entry = await getEntry(key, globalIpStore);

  if (!entry) {
    return { isLimited: false, remainingSeconds: 0 };
  }

  const now = Date.now();

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      isLimited: true,
      remainingSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  return { isLimited: false, remainingSeconds: 0 };
}

/**
 * Record a failed attempt for global IP tracking
 */
export async function recordGlobalIpAttempt(ip: string): Promise<{
  locked: boolean;
  lockoutSeconds: number;
}> {
  if (!ip || ip === "unknown") {
    return { locked: false, lockoutSeconds: 0 };
  }

  const key = `global_ip_${ip}`;
  const now = Date.now();
  let entry = await getEntry(key, globalIpStore);

  if (!entry) {
    entry = { attempts: 0, lockedUntil: null, lastAttempt: now };
  }

  entry.attempts += 1;
  entry.lastAttempt = now;

  if (entry.attempts >= GLOBAL_IP_MAX_ATTEMPTS) {
    const lockoutIndex = Math.min(
      Math.floor((entry.attempts - GLOBAL_IP_MAX_ATTEMPTS) / GLOBAL_IP_MAX_ATTEMPTS),
      GLOBAL_LOCKOUT_MINUTES.length - 1
    );
    const lockoutMinutes = GLOBAL_LOCKOUT_MINUTES[lockoutIndex];
    entry.lockedUntil = now + lockoutMinutes * 60 * 1000;

    globalIpStore.set(key, entry);
    await syncToDatabase(key, entry);

    return { locked: true, lockoutSeconds: lockoutMinutes * 60 };
  }

  globalIpStore.set(key, entry);
  // Don't sync every attempt to database - only on lockout
  return { locked: false, lockoutSeconds: 0 };
}

/**
 * Check if an identifier is rate limited
 * @param identifier - Unique identifier (childId, IP, or combination)
 * @returns Object with isLimited flag and remaining lockout time
 */
export async function checkRateLimit(identifier: string): Promise<{
  isLimited: boolean;
  remainingSeconds: number;
  attemptsRemaining: number;
}> {
  const entry = await getEntry(identifier, rateLimitStore);

  if (!entry) {
    return {
      isLimited: false,
      remainingSeconds: 0,
      attemptsRemaining: MAX_ATTEMPTS,
    };
  }

  const now = Date.now();

  // Check if currently locked out
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      isLimited: true,
      remainingSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
      attemptsRemaining: 0,
    };
  }

  // If lockout expired, reset to MAX_ATTEMPTS - previous failures
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - entry.attempts);

  return {
    isLimited: false,
    remainingSeconds: 0,
    attemptsRemaining,
  };
}

/**
 * Record a failed attempt for an identifier
 * @param identifier - Unique identifier (childId, IP, or combination)
 * @returns Lockout info if threshold reached
 */
export async function recordFailedAttempt(identifier: string): Promise<{
  locked: boolean;
  lockoutSeconds: number;
  attemptsRemaining: number;
}> {
  const now = Date.now();
  let entry = await getEntry(identifier, rateLimitStore);

  if (!entry) {
    entry = { attempts: 0, lockedUntil: null, lastAttempt: now };
  }

  // If previous lockout expired, don't reset attempts (they accumulate)
  entry.attempts += 1;
  entry.lastAttempt = now;

  // Check if we've exceeded max attempts
  if (entry.attempts >= MAX_ATTEMPTS) {
    // Calculate lockout period (escalating)
    const lockoutIndex = Math.min(
      Math.floor((entry.attempts - MAX_ATTEMPTS) / MAX_ATTEMPTS),
      LOCKOUT_MINUTES.length - 1
    );
    const lockoutMinutes = LOCKOUT_MINUTES[lockoutIndex];
    const lockoutMs = lockoutMinutes * 60 * 1000;

    entry.lockedUntil = now + lockoutMs;
    rateLimitStore.set(identifier, entry);
    await syncToDatabase(identifier, entry);

    return {
      locked: true,
      lockoutSeconds: lockoutMinutes * 60,
      attemptsRemaining: 0,
    };
  }

  rateLimitStore.set(identifier, entry);
  // Don't sync every attempt - only on lockout

  return {
    locked: false,
    lockoutSeconds: 0,
    attemptsRemaining: MAX_ATTEMPTS - entry.attempts,
  };
}

/**
 * Record a successful login - clears the rate limit entry
 * @param identifier - Unique identifier
 */
export async function recordSuccessfulAttempt(identifier: string): Promise<void> {
  rateLimitStore.delete(identifier);

  // Also clear from database
  try {
    const supabase = await createClient();
    await supabase.from("rate_limit_entries").delete().eq("key", identifier);
  } catch {
    // Silently fail
  }
}

/**
 * Clear global IP attempts on successful login
 */
export async function clearGlobalIpAttempts(ip: string): Promise<void> {
  if (!ip || ip === "unknown") return;

  const key = `global_ip_${ip}`;
  globalIpStore.delete(key);

  try {
    const supabase = await createClient();
    await supabase.from("rate_limit_entries").delete().eq("key", key);
  } catch {
    // Silently fail
  }
}

/**
 * Get a composite identifier from IP and childId for rate limiting
 * @param ip - Client IP address
 * @param childId - Child profile ID
 */
export function getRateLimitKey(ip: string | null, childId: string): string {
  // Use both IP and childId to prevent:
  // 1. One kid locking out all kids (by targeting childId)
  // 2. Same IP attacking multiple accounts
  return `pin_${ip || "unknown"}_${childId}`;
}

/**
 * Get rate limit key for family code lookup
 * @param ip - Client IP address
 * @param familyCode - Family access code
 */
export function getFamilyCodeRateLimitKey(ip: string | null, familyCode: string): string {
  return `family_${ip || "unknown"}_${familyCode.toUpperCase()}`;
}
