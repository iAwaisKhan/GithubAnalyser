import { describe, it, expect } from "vitest";
import { computeRawScore, normalizeScores } from "../lib/scoring";

const baseRepo = {
  name: "test-repo",
  description: "A test repository",
  language: "TypeScript",
  stargazers_count: 0,
  forks_count: 0,
  html_url: "https://github.com/user/test-repo",
  pushed_at: new Date().toISOString(),
  default_branch: "main",
};

describe("computeRawScore", () => {
  it("scores zero for empty repo with no readme", () => {
    const result = computeRawScore({ ...baseRepo, description: null, stargazers_count: 0, forks_count: 0 }, false);
    expect(result.raw_score).toBeGreaterThanOrEqual(0);
    expect(result.has_description).toBe(false);
    expect(result.has_readme).toBe(false);
  });

  it("adds 20 points for readme", () => {
    const withReadme = computeRawScore({ ...baseRepo, description: null }, true);
    const withoutReadme = computeRawScore({ ...baseRepo, description: null }, false);
    expect(withReadme.raw_score - withoutReadme.raw_score).toBeCloseTo(20, 0);
  });

  it("adds 10 points for description", () => {
    const withDesc = computeRawScore({ ...baseRepo, description: "A description" }, false);
    const withoutDesc = computeRawScore({ ...baseRepo, description: null }, false);
    expect(withDesc.raw_score - withoutDesc.raw_score).toBeCloseTo(10, 0);
  });

  it("weights stars at 0.4", () => {
    const r = computeRawScore({ ...baseRepo, description: null, stargazers_count: 100, forks_count: 0 }, false);
    // 100 * 0.4 = 40 + recency
    expect(r.raw_score).toBeGreaterThanOrEqual(40);
  });

  it("weights forks at 0.3", () => {
    const r = computeRawScore({ ...baseRepo, description: null, stargazers_count: 0, forks_count: 100 }, false);
    expect(r.raw_score).toBeGreaterThanOrEqual(30);
  });

  it("gives full recency score for very recent push", () => {
    const recent = computeRawScore({ ...baseRepo, pushed_at: new Date().toISOString() }, false);
    expect(recent.recent_activity_score).toBeGreaterThan(18);
  });

  it("gives zero recency score for very old push", () => {
    const old = computeRawScore({ ...baseRepo, pushed_at: "2019-01-01T00:00:00Z" }, false);
    expect(old.recent_activity_score).toBe(0);
  });
});

describe("normalizeScores", () => {
  it("returns 100 for the highest scorer", () => {
    const repos = [{ raw_score: 50 }, { raw_score: 100 }, { raw_score: 25 }];
    const scores = normalizeScores(repos);
    expect(Math.max(...scores)).toBe(100);
  });

  it("normalizes proportionally", () => {
    const repos = [{ raw_score: 0 }, { raw_score: 50 }, { raw_score: 100 }];
    const scores = normalizeScores(repos);
    expect(scores[0]).toBe(0);
    expect(scores[1]).toBe(50);
    expect(scores[2]).toBe(100);
  });

  it("handles all-zero scores without dividing by zero", () => {
    const repos = [{ raw_score: 0 }, { raw_score: 0 }];
    const scores = normalizeScores(repos);
    expect(scores).toEqual([0, 0]);
  });

  it("caps at 100", () => {
    const repos = [{ raw_score: 1000 }];
    const scores = normalizeScores(repos);
    expect(scores[0]).toBeLessThanOrEqual(100);
  });
});
