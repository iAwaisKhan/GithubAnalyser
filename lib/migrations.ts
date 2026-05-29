import { pool } from "./db";

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "create_user_snapshots",
    sql: `
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
    `,
  },
  {
    version: 2,
    name: "create_users",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id                SERIAL PRIMARY KEY,
        email             TEXT UNIQUE NOT NULL,
        name              TEXT,
        image             TEXT,
        github_username   TEXT,
        plan              TEXT NOT NULL DEFAULT 'free',
        analyses_used     INT  NOT NULL DEFAULT 0,
        stripe_customer_id TEXT,
        created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
    `,
  },
  {
    version: 3,
    name: "add_digest_opted_in",
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS digest_opted_in BOOLEAN NOT NULL DEFAULT false;
    `,
  },
];

export async function runAllMigrations(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INT PRIMARY KEY,
        name       TEXT NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch {
    // DATABASE_URL not configured — skip silently
    return;
  }

  const { rows } = await pool.query<{ version: number }>(
    "SELECT version FROM schema_migrations ORDER BY version"
  );
  const applied = new Set(rows.map((r) => r.version));

  const pending = MIGRATIONS.filter((m) => !applied.has(m.version));
  if (pending.length === 0) {
    console.log("[migrations] Schema is up to date");
    return;
  }

  for (const migration of pending) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
        [migration.version, migration.name]
      );
      await client.query("COMMIT");
      console.log(`[migrations] Applied migration ${migration.version}: ${migration.name}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrations] Failed migration ${migration.version}: ${migration.name}`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}
