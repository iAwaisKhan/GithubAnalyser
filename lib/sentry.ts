/**
 * Sentry error tracking wrapper.
 * Initializes Sentry when SENTRY_DSN is configured; otherwise, all exports are no-ops.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || "development",
  });
}

/**
 * Capture an exception in Sentry, with optional extra context.
 * No-op if SENTRY_DSN is not configured.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!dsn) return;
  Sentry.captureException(error, { extra: context });
}

/**
 * Capture a message in Sentry.
 * No-op if SENTRY_DSN is not configured.
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
): void {
  if (!dsn) return;
  Sentry.captureMessage(message, level);
}
