export interface RawRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  pushed_at: string | null;
  default_branch: string;
}

export interface ScoredRepo extends RawRepo {
  has_description: boolean;
  has_readme: boolean;
  recent_activity_score: number;
  raw_score: number;
  score: number; // normalized 0–100
  ai_review: string;
}

/** Score recency: full 20 pts if pushed within 30 days, decays to 0 at 2 years */
function recencyScore(pushedAt: string | null): number {
  if (!pushedAt) return 0;
  const ageMs = Date.now() - new Date(pushedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const maxDays = 730; // 2 years
  return Math.max(0, 20 * (1 - ageDays / maxDays));
}

export function computeRawScore(
  repo: RawRepo,
  has_readme: boolean
): { raw_score: number; has_description: boolean; has_readme: boolean; recent_activity_score: number } {
  const has_description = Boolean(repo.description?.trim());
  const recent_activity_score = recencyScore(repo.pushed_at);

  const raw_score =
    repo.stargazers_count * 0.4 +
    repo.forks_count * 0.3 +
    (has_readme ? 20 : 0) +
    (has_description ? 10 : 0) +
    recent_activity_score;

  return { raw_score, has_description, has_readme, recent_activity_score };
}

/** Normalize an array of raw scores to 0–100 range */
export function normalizeScores(repos: Array<{ raw_score: number }>): number[] {
  const scores = repos.map((r) => r.raw_score);
  const max = Math.max(...scores, 1); // avoid div-by-zero
  return scores.map((s) => Math.min(100, Math.round((s / max) * 100)));
}
