import { Pool } from "pg";
import { runAllMigrations } from "./migrations";

// Singleton pool — safe for Next.js serverless (connection pooling via Neon/Supabase pgBouncer)
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
      process.env.DATABASE_URL?.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

/** Run migrations on cold start — idempotent, versioned */
export async function runMigrations() {
  await runAllMigrations();
}
