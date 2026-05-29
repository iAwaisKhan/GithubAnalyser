import { Redis } from "@upstash/redis";

// Singleton Redis client
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null);

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

// Cache TTLs (seconds)
export const CACHE_TTL = {
  profile: 5 * 60,       // 5 min — profile data
  analysis: 10 * 60,     // 10 min — full AI analysis (expensive)
  compare: 5 * 60,       // 5 min — comparison
};

export function cacheKey(type: string, ...parts: string[]): string {
  return `gha:${type}:${parts.join(":")}`;
}

/** Get cached value — returns null if redis unavailable or key missing */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const val = await redis.get<T>(key);
    return val ?? null;
  } catch (e) {
    console.warn("Cache GET error:", e);
    return null;
  }
}

/** Set cache value with TTL */
export async function setCache<T>(key: string, value: T, ttl: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttl });
  } catch (e) {
    console.warn("Cache SET error:", e);
  }
}

/** Invalidate a cache key */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {}
}
