export interface DayEntry {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Build a map of date → commit count from GitHub events */
export function buildDailyMap(
  events: Array<{ type: string; created_at: string; payload?: { commits?: unknown[] } }>
): Record<string, number> {
  const map: Record<string, number> = {};

  for (const event of events) {
    if (event.type !== "PushEvent") continue;
    const date = event.created_at.slice(0, 10); // YYYY-MM-DD
    const commitCount =
      (event.payload?.commits as unknown[] | undefined)?.length ?? 1;
    map[date] = (map[date] ?? 0) + commitCount;
  }

  return map;
}

/** Fill in the last N days as a dense array, zeroing missing dates */
export function buildHeatmap(
  dailyMap: Record<string, number>,
  days = 90
): DayEntry[] {
  const result: DayEntry[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    result.push({ date: dateStr, count: dailyMap[dateStr] ?? 0 });
  }

  return result;
}

/** Count consecutive active days ending today (or yesterday if today = 0) */
export function currentStreak(heatmap: DayEntry[]): number {
  const reversed = [...heatmap].reverse();
  if (reversed.length === 0) return 0;

  // If today has commits, start counting from today (index 0).
  // Otherwise, start counting from yesterday (index 1) to allow a 1-day buffer.
  const startIdx = reversed[0].count > 0 ? 0 : 1;
  let streak = 0;

  for (let i = startIdx; i < reversed.length; i++) {
    if (reversed[i].count > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/** Max consecutive active days anywhere in the dataset */
export function longestStreak(heatmap: DayEntry[]): number {
  let max = 0;
  let current = 0;

  for (const { count } of heatmap) {
    if (count > 0) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }

  return max;
}

/** 0–100 consistency score */
export function consistencyScore(heatmap: DayEntry[]): number {
  const total = heatmap.length;
  if (total === 0) return 0;

  const activeDays = heatmap.filter((d) => d.count > 0).length;
  const longest = longestStreak(heatmap);

  const raw =
    (activeDays / total) * 70 +
    (longest / total) * 30;

  return Math.min(100, Math.round(raw));
}

export interface ConsistencyStats {
  score: number;
  current_streak: number;
  longest_streak: number;
  active_days: number;
  total_days: number;
  total_commits: number;
  heatmap: DayEntry[];
}

export function computeConsistency(
  dailyMap: Record<string, number>,
  days = 90
): ConsistencyStats {
  const heatmap = buildHeatmap(dailyMap, days);
  const total_commits = Object.values(dailyMap).reduce((a, b) => a + b, 0);

  return {
    score: consistencyScore(heatmap),
    current_streak: currentStreak(heatmap),
    longest_streak: longestStreak(heatmap),
    active_days: heatmap.filter((d) => d.count > 0).length,
    total_days: days,
    total_commits,
    heatmap,
  };
}
