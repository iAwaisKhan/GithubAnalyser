import { Pool } from "pg";

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

/** Run migrations on cold start — idempotent */
export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_snapshots (
      id          SERIAL PRIMARY KEY,
      username    TEXT        NOT NULL,
      repo_count  INT         NOT NULL DEFAULT 0,
      total_stars INT         NOT NULL DEFAULT 0,
      consistency_score INT  NOT NULL DEFAULT 0,
      avg_repo_score    INT  NOT NULL DEFAULT 0,
      top_language      TEXT,
      created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_username_time
      ON user_snapshots (username, created_at DESC);
  `);
}
