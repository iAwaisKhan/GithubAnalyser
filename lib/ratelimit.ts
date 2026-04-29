import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { NextRequest } from "next/server";

// In-memory fallback when Redis is unavailable
const memoryStore = new Map<string, { count: number; reset: number }>();

function memoryRateLimit(key: string, limit: number, windowMs: number): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.reset) {
    memoryStore.set(key, { count: 1, reset: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.reset };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.reset };
}

// Rate limit tiers
const LIMITS = {
  free:       { requests: 5,   window: "1 d" },
  pro:        { requests: 100, window: "1 d" },
  enterprise: { requests: 500, window: "1 d" },
  anonymous:  { requests: 3,   window: "1 h" },
  compare:    { requests: 10,  window: "1 d" },
} as const;

// Create Upstash rate limiters (only if Redis is available)
function createLimiter(requests: number, window: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    analytics: true,
    prefix: "gha:rl",
  });
}

const limiters = {
  free: createLimiter(5, "1 d"),
  pro: createLimiter(100, "1 d"),
  enterprise: createLimiter(500, "1 d"),
  anonymous: createLimiter(3, "1 h"),
  compare: createLimiter(10, "1 d"),
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

export async function checkRateLimit(
  req: NextRequest,
  plan: "free" | "pro" | "enterprise" | "anonymous" = "anonymous",
  identifier?: string
): Promise<RateLimitResult> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const id = identifier ?? ip;
  const key = `${plan}:${id}`;
  const tier = LIMITS[plan];

  const limiter = limiters[plan];

  if (limiter) {
    try {
      const result = await limiter.limit(key);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        limit: tier.requests,
      };
    } catch (e) {
      console.warn("Rate limiter error, falling back to memory:", e);
    }
  }

  // Memory fallback
  const windowMs = plan === "anonymous" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const result = memoryRateLimit(key, tier.requests, windowMs);
  return { ...result, limit: tier.requests };
}

/** Returns a 429 Response if rate limited, null if OK */
export async function rateLimitMiddleware(
  req: NextRequest,
  plan: "free" | "pro" | "enterprise" | "anonymous",
  identifier?: string
): Promise<Response | null> {
  const result = await checkRateLimit(req, plan, identifier);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        plan,
        limit: result.limit,
        reset: new Date(result.reset).toISOString(),
        upgrade_url: "/billing",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.reset),
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
