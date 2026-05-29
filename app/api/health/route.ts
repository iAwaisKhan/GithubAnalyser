import { NextRequest, NextResponse } from "next/server";
import { getCache } from "@/lib/redis";

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

export async function GET(_req: NextRequest): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString();
  const uptime_seconds = Math.floor((Date.now() - START_TIME) / 1000);

  const checks: HealthStatus["checks"] = {};

  // ── Redis check ───────────────────────────────────────────────────────────
  try {
    const testKey = "health:ping";
    await getCache(testKey); // This will fail gracefully if Redis unavailable
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  // ── Anthropic check ───────────────────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-1",
          max_tokens: 10,
          messages: [{ role: "user", content: "ok" }],
        }),
      });
      checks.anthropic = res.ok || res.status === 401; // 401 = auth issue, still "up"
    } catch {
      checks.anthropic = false;
    }
  }

  // ── GitHub API check ──────────────────────────────────────────────────────
  if (process.env.GITHUB_TOKEN) {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      });
      checks.github_api = res.ok || res.status === 401;
    } catch {
      checks.github_api = false;
    }
  }

  // ── Determine overall status ───────────────────────────────────────────────
  const checkValues = Object.values(checks);
  const healthyCount = checkValues.filter(Boolean).length;
  const status =
    healthyCount === checkValues.length
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
