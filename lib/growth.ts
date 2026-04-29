import { pool, runMigrations } from "./db";

export interface Snapshot {
  id: number;
  username: string;
  repo_count: number;
  total_stars: number;
  consistency_score: number;
  avg_repo_score: number;
  top_language: string | null;
  created_at: Date;
}

export interface GrowthDiff {
  repo_growth: number;
  stars_growth: number;
  consistency_change: number;
  score_change: number;
  snapshots_available: number;
  latest: Snapshot;
  previous: Snapshot | null;
}

export interface SnapshotInput {
  username: string;
  repo_count: number;
  total_stars: number;
  consistency_score: number;
  avg_repo_score: number;
  top_language: string | null;
}

/** Save a new snapshot — skips duplicate if identical values within last 1h */
export async function saveSnapshot(input: SnapshotInput): Promise<Snapshot> {
  await runMigrations();

  // Dedup: if same values recorded in last 60 minutes, skip insert
  const existing = await pool.query<Snapshot>(
    `SELECT * FROM user_snapshots
     WHERE username = $1
       AND created_at > NOW() - INTERVAL '60 minutes'
       AND repo_count = $2
       AND total_stars = $3
     ORDER BY created_at DESC LIMIT 1`,
    [input.username, input.repo_count, input.total_stars]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const res = await pool.query<Snapshot>(
    `INSERT INTO user_snapshots
       (username, repo_count, total_stars, consistency_score, avg_repo_score, top_language)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      input.username,
      input.repo_count,
      input.total_stars,
      input.consistency_score,
      input.avg_repo_score,
      input.top_language,
    ]
  );
  return res.rows[0];
}

/** Fetch last N snapshots for a user */
export async function getSnapshots(
  username: string,
  limit = 10
): Promise<Snapshot[]> {
  await runMigrations();
  const res = await pool.query<Snapshot>(
    `SELECT * FROM user_snapshots
     WHERE username = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [username, limit]
  );
  return res.rows;
}

/** Compute growth diff between latest and previous snapshot */
export async function getGrowthDiff(
  username: string,
  current: SnapshotInput
): Promise<GrowthDiff | null> {
  const latest = await saveSnapshot(current);
  const history = await getSnapshots(username, 10);
  if (history.length < 2) {
    return {
      repo_growth: 0,
      stars_growth: 0,
      consistency_change: 0,
      score_change: 0,
      snapshots_available: history.length,
      latest,
      previous: null,
    };
  }

  // latest = history[0], previous = next distinct entry
  const previous = history[1];
  return {
    repo_growth: latest.repo_count - previous.repo_count,
    stars_growth: latest.total_stars - previous.total_stars,
    consistency_change: latest.consistency_score - previous.consistency_score,
    score_change: latest.avg_repo_score - previous.avg_repo_score,
    snapshots_available: history.length,
    latest,
    previous,
  };
}

/** Chronological history (for sparkline) */
export async function getGrowthHistory(username: string): Promise<Snapshot[]> {
  await runMigrations();
  const res = await pool.query<Snapshot>(
    `SELECT * FROM user_snapshots
     WHERE username = $1
     ORDER BY created_at ASC
     LIMIT 20`,
    [username]
  );
  return res.rows;
}
