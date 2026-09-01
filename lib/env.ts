/**
 * lib/env.ts — Validated environment variables.
 * Import `env` instead of process.env for type-safe, validated config.
 * Missing required vars throw on first server render; optional vars warn.
 */
import { z } from "zod";

const EnvSchema = z.object({
  // ── Required ──────────────────────────────────────────────────────────────
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // ── Optional — features degrade gracefully when absent ───────────────────
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  DATABASE_URL: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  CRON_SECRET: z.string().optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .filter((i) => i.message.includes("required") || i.code === "invalid_type")
      .map((i) => i.path.join("."));

    console.error(
      "❌ [env] Missing required environment variables:\n" +
        missing.map((k) => `  • ${k}`).join("\n")
    );
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  // Warn about missing optional feature vars (only in non-test environments)
  if (parsed.data.NODE_ENV !== "test") {
    const optionalFeatures: Array<{ vars: string[]; feature: string }> = [
      { vars: ["ANTHROPIC_API_KEY"], feature: "AI analysis (all AI sections will show fallback text)" },
      { vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"], feature: "Redis caching (in-memory fallback active)" },
      { vars: ["DATABASE_URL"], feature: "Growth tracking (snapshots disabled)" },
      { vars: ["GITHUB_TOKEN"], feature: "Authenticated GitHub API (lower rate limits)" },
      { vars: ["STRIPE_SECRET_KEY"], feature: "Billing / subscriptions" },
      { vars: ["RESEND_API_KEY"], feature: "Weekly digest emails" },
      { vars: ["SENTRY_DSN"], feature: "Error tracking (Sentry disabled)" },
      { vars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"], feature: "GitHub OAuth login" },
      { vars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], feature: "Google OAuth login" },
    ];

    for (const { vars, feature } of optionalFeatures) {
      const missing = vars.filter((v) => !process.env[v]);
      if (missing.length > 0) {
        console.warn(`⚠️  [env] ${feature} — missing: ${missing.join(", ")}`);
      }
    }
  }

  return parsed.data;
}

// Validate once at module load. In Next.js this runs on first server render.
export const env: Env = validateEnv();
