import { describe, it, expect } from "vitest";
import {
  buildHeatmap,
  currentStreak,
  longestStreak,
  consistencyScore,
  buildDailyMap,
} from "../lib/consistency";

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

describe("buildDailyMap", () => {
  it("counts push events by date", () => {
    const events = [
      { type: "PushEvent", created_at: "2025-01-15T10:00:00Z", payload: { commits: [{}, {}] } },
      { type: "PushEvent", created_at: "2025-01-15T14:00:00Z", payload: { commits: [{}] } },
      { type: "WatchEvent", created_at: "2025-01-15T12:00:00Z" },
    ];
    const map = buildDailyMap(events as Parameters<typeof buildDailyMap>[0]);
    expect(map["2025-01-15"]).toBe(3);
  });

  it("ignores non-push events", () => {
    const events = [{ type: "WatchEvent", created_at: "2025-01-15T10:00:00Z" }];
    const map = buildDailyMap(events as Parameters<typeof buildDailyMap>[0]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("defaults to 1 commit when payload is missing", () => {
    const events = [{ type: "PushEvent", created_at: "2025-01-15T10:00:00Z" }];
    const map = buildDailyMap(events as Parameters<typeof buildDailyMap>[0]);
    expect(map["2025-01-15"]).toBe(1);
  });
});

describe("buildHeatmap", () => {
  it("returns exactly N days", () => {
    const heatmap = buildHeatmap({}, 90);
    expect(heatmap).toHaveLength(90);
  });

  it("fills in contribution counts from daily map", () => {
    const today = dateStr(0);
    const map = { [today]: 5 };
    const heatmap = buildHeatmap(map, 30);
    const entry = heatmap.find((d) => d.date === today);
    expect(entry?.count).toBe(5);
  });

  it("fills in 0 for missing dates", () => {
    const heatmap = buildHeatmap({}, 7);
    expect(heatmap.every((d) => d.count === 0)).toBe(true);
  });
});

describe("currentStreak", () => {
  it("returns 0 for empty activity", () => {
    const heatmap = buildHeatmap({}, 30);
    expect(currentStreak(heatmap)).toBe(0);
  });

  it("counts consecutive days from today", () => {
    const map: Record<string, number> = {};
    map[dateStr(0)] = 3;
    map[dateStr(1)] = 2;
    map[dateStr(2)] = 1;
    const heatmap = buildHeatmap(map, 30);
    expect(currentStreak(heatmap)).toBe(3);
  });

  it("stops at a gap", () => {
    const map: Record<string, number> = {};
    map[dateStr(0)] = 2;
    // day 1 is missing (gap)
    map[dateStr(2)] = 1;
    const heatmap = buildHeatmap(map, 30);
    expect(currentStreak(heatmap)).toBe(1);
  });
});

describe("longestStreak", () => {
  it("returns 0 for no activity", () => {
    expect(longestStreak(buildHeatmap({}, 30))).toBe(0);
  });

  it("finds longest run", () => {
    const map: Record<string, number> = {};
    // 3-day run
    map[dateStr(10)] = 1;
    map[dateStr(11)] = 1;
    map[dateStr(12)] = 1;
    // 5-day run
    for (let i = 20; i <= 24; i++) map[dateStr(i)] = 1;
    const heatmap = buildHeatmap(map, 30);
    expect(longestStreak(heatmap)).toBe(5);
  });
});

describe("consistencyScore", () => {
  it("returns 0 for no activity", () => {
    expect(consistencyScore(buildHeatmap({}, 90))).toBe(0);
  });

  it("returns a value between 0 and 100", () => {
    const map: Record<string, number> = {};
    for (let i = 0; i < 45; i++) map[dateStr(i)] = 2;
    const score = consistencyScore(buildHeatmap(map, 90));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns higher score for more active developer", () => {
    const highMap: Record<string, number> = {};
    const lowMap: Record<string, number> = {};
    for (let i = 0; i < 80; i++) highMap[dateStr(i)] = 3;
    for (let i = 0; i < 10; i++) lowMap[dateStr(i)] = 1;
    const high = consistencyScore(buildHeatmap(highMap, 90));
    const low = consistencyScore(buildHeatmap(lowMap, 90));
    expect(high).toBeGreaterThan(low);
  });
});
