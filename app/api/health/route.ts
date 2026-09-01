import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    redis?: boolean;
    anthropic?: boolean;
    github_api?: boolean;
  };
  uptime_seconds: number;
}

const START_TIME = Date.now();

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString();
  const uptime_seconds = Math.floor((Date.now() - START_TIME) / 1000);

  const checks: HealthStatus["checks"] = {};

  // Keep health checks cheap: do not make billable or rate-limited requests.
  if (process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN) {
    checks.redis = Boolean(redis);
  }

  // ── Anthropic check ───────────────────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) checks.anthropic = true;

  // ── GitHub API check ──────────────────────────────────────────────────────
  if (process.env.GITHUB_TOKEN) checks.github_api = true;

  // ── Determine overall status ───────────────────────────────────────────────
  const checkValues = Object.values(checks);
  const healthyCount = checkValues.filter(Boolean).length;
  const status =
    checkValues.length === 0 || healthyCount === checkValues.length
      ? "healthy"
      : healthyCount > 0
        ? "degraded"
        : "unhealthy";

  return NextResponse.json(
    { status, timestamp, checks, uptime_seconds },
    {
      status: status === "healthy" ? 200 : status === "degraded" ? 206 : 503,
      headers: { "Cache-Control": "no-cache" },
    }
  );
}
