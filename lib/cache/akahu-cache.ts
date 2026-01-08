/**
 * Akahu API Response Caching
 *
 * Reduces API costs by caching responses in Redis with appropriate TTLs.
 * Cache is automatically invalidated when user manually adds transactions
 * or when cache expires.
 *
 * NOTE: Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
 */

import { Redis } from "@upstash/redis";

// Initialize Redis client - will fail gracefully if not configured
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[Cache] Upstash Redis not configured - caching disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
    );
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// Cache durations (in seconds)
export const CACHE_TTL = {
  ACCOUNTS: 5 * 60, // 5 minutes - balances change frequently
  TRANSACTIONS_RECENT: 15 * 60, // 15 minutes - recent transactions
  TRANSACTIONS_OLD: 24 * 60 * 60, // 24 hours - historical data rarely changes
  ACCOUNT_METADATA: 7 * 24 * 60 * 60, // 7 days - account names/types rarely change
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheResult<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
  age: number; // age in seconds
}

/**
 * Get cached Akahu accounts for a user
 */
export async function getCachedAccounts(
  userId: string,
): Promise<CacheResult<unknown> | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const cached = await client.get<CacheEntry<unknown>>(
      `akahu:accounts:${userId}`,
    );

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const isStale = age > cached.ttl * 1000;

    return {
      data: cached.data,
      timestamp: cached.timestamp,
      isStale,
      age: Math.floor(age / 1000),
    };
  } catch (error) {
    console.error("[Cache] Read error:", error);
    return null;
  }
}

/**
 * Cache Akahu accounts response
 */
export async function setCachedAccounts(
  userId: string,
  data: unknown,
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const entry: CacheEntry<unknown> = {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL.ACCOUNTS,
    };

    await client.set(`akahu:accounts:${userId}`, entry, {
      ex: CACHE_TTL.ACCOUNTS,
    });

    console.log(`[Cache] ✅ Set accounts for user ${userId.slice(0, 8)}...`);
    return true;
  } catch (error) {
    console.error("[Cache] Write error:", error);
    return false;
  }
}

/**
 * Get cached Akahu transactions for a user
 */
export async function getCachedTransactions(
  userId: string,
  accountId?: string,
): Promise<CacheResult<unknown> | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const key = accountId
      ? `akahu:transactions:${userId}:${accountId}`
      : `akahu:transactions:${userId}`;

    const cached = await client.get<CacheEntry<unknown>>(key);

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const isStale = age > cached.ttl * 1000;

    return {
      data: cached.data,
      timestamp: cached.timestamp,
      isStale,
      age: Math.floor(age / 1000),
    };
  } catch (error) {
    console.error("[Cache] Read error:", error);
    return null;
  }
}

/**
 * Cache Akahu transactions response
 */
export async function setCachedTransactions(
  userId: string,
  data: unknown,
  accountId?: string,
  isRecent: boolean = true,
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const key = accountId
      ? `akahu:transactions:${userId}:${accountId}`
      : `akahu:transactions:${userId}`;

    const ttl = isRecent
      ? CACHE_TTL.TRANSACTIONS_RECENT
      : CACHE_TTL.TRANSACTIONS_OLD;

    const entry: CacheEntry<unknown> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    await client.set(key, entry, { ex: ttl });

    console.log(
      `[Cache] ✅ Set transactions for user ${userId.slice(0, 8)}..., account ${accountId || "all"}`,
    );
    return true;
  } catch (error) {
    console.error("[Cache] Write error:", error);
    return false;
  }
}

/**
 * Invalidate all Akahu cache for a user
 * Use when user manually adds/edits transactions or requests reconciliation
 */
export async function invalidateAkahuCache(userId: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    // Get all keys matching pattern
    const accountsKey = `akahu:accounts:${userId}`;
    const transactionsPattern = `akahu:transactions:${userId}*`;

    // Delete accounts key
    await client.del(accountsKey);

    // Scan for transaction keys and delete them
    let cursor: number | string = 0;
    let deletedCount = 1; // counting accounts key

    do {
      const result: [string | number, string[]] = await client.scan(cursor, {
        match: transactionsPattern,
        count: 100,
      });

      cursor = result[0];
      const keys: string[] = result[1];

      if (keys.length > 0) {
        await client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0 && cursor !== "0");

    console.log(
      `[Cache] 🗑️ Invalidated ${deletedCount} keys for user ${userId.slice(0, 8)}...`,
    );
    return true;
  } catch (error) {
    console.error("[Cache] Invalidation error:", error);
    return false;
  }
}

/**
 * Invalidate only transactions cache (keep accounts cache)
 * Use when user adds a manual transaction
 */
export async function invalidateTransactionsCache(
  userId: string,
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const pattern = `akahu:transactions:${userId}*`;

    // Scan for transaction keys and delete them
    let cursor: number | string = 0;
    let deletedCount = 0;

    do {
      const result: [string | number, string[]] = await client.scan(cursor, {
        match: pattern,
        count: 100,
      });

      cursor = result[0];
      const keys: string[] = result[1];

      if (keys.length > 0) {
        await client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0 && cursor !== "0");

    console.log(
      `[Cache] 🗑️ Invalidated ${deletedCount} transaction keys for user ${userId.slice(0, 8)}...`,
    );
    return true;
  } catch (error) {
    console.error("[Cache] Invalidation error:", error);
    return false;
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(userId: string): Promise<{
  accounts: { age: number; isStale: boolean; timestamp: string } | null;
  transactions: { age: number; isStale: boolean; timestamp: string } | null;
  redisConfigured: boolean;
} | null> {
  const client = getRedisClient();

  if (!client) {
    return {
      accounts: null,
      transactions: null,
      redisConfigured: false,
    };
  }

  try {
    const accounts = await getCachedAccounts(userId);
    const transactions = await getCachedTransactions(userId);

    return {
      accounts: accounts
        ? {
            age: accounts.age,
            isStale: accounts.isStale,
            timestamp: new Date(accounts.timestamp).toISOString(),
          }
        : null,
      transactions: transactions
        ? {
            age: transactions.age,
            isStale: transactions.isStale,
            timestamp: new Date(transactions.timestamp).toISOString(),
          }
        : null,
      redisConfigured: true,
    };
  } catch (error) {
    console.error("[Cache] Stats error:", error);
    return null;
  }
}
