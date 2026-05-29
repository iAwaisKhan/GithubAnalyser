import { describe, it, expect } from "vitest";
import { aggregateLanguages, inferSkills, detectStrengths, detectWeaknesses } from "../lib/languages";

const makeRepos = (langs: Array<string | null>) =>
  langs.map((language, i) => ({ name: `repo-${i}`, language }));

describe("aggregateLanguages", () => {
  it("returns empty object for no repos", () => {
    expect(aggregateLanguages([])).toEqual({});
  });

  it("counts languages correctly", () => {
    const repos = makeRepos(["TypeScript", "TypeScript", "Python"]);
    const result = aggregateLanguages(repos);
    expect(result["TypeScript"]).toBe(67); // 2/3 ≈ 67%
    expect(result["Python"]).toBe(33);
  });

  it("ignores null languages", () => {
    const repos = makeRepos(["TypeScript", null, null]);
    const result = aggregateLanguages(repos);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result["TypeScript"]).toBe(100);
  });

  it("limits to top 8 languages", () => {
    const langs = ["JS","TS","Py","Go","Rust","Java","C++","C","Ruby","PHP"];
    const repos = makeRepos(langs);
    const result = aggregateLanguages(repos);
    expect(Object.keys(result).length).toBeLessThanOrEqual(8);
  });

  it("percentages roughly sum to 100", () => {
    const repos = makeRepos(["TypeScript", "Python", "Go", "Rust"]);
    const result = aggregateLanguages(repos);
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });
});

describe("inferSkills", () => {
  it("maps TypeScript to fullstack skill", () => {
    const skills = inferSkills({ TypeScript: 100 });
    expect(skills).toContain("Typed Fullstack Development");
  });

  it("deduplicates similar skills", () => {
    const skills = inferSkills({ JavaScript: 60, TypeScript: 40 });
    const unique = new Set(skills);
    expect(unique.size).toBe(skills.length);
  });

  it("returns empty array for unknown languages", () => {
    const skills = inferSkills({ COBOL: 100 });
    expect(skills).toHaveLength(0);
  });
});

describe("detectStrengths", () => {
  const baseParams = {
    languages: { TypeScript: 50, Python: 50 },
    avgRepoScore: 50,
    consistencyScore: 50,
    longestStreak: 10,
    activeDays: 45,
    totalDays: 90,
    hasReadmeRatio: 0.7,
  };

  it("returns an array", () => {
    expect(Array.isArray(detectStrengths(baseParams))).toBe(true);
  });

  it("detects fullstack when both web and backend languages present", () => {
    const strengths = detectStrengths({
      ...baseParams,
      languages: { TypeScript: 50, Python: 50 },
    });
    expect(strengths.some((s) => s.toLowerCase().includes("fullstack"))).toBe(true);
  });

  it("detects consistency for high consistency score", () => {
    const strengths = detectStrengths({ ...baseParams, consistencyScore: 80 });
    expect(strengths.some((s) => s.toLowerCase().includes("consistent"))).toBe(true);
  });

  it("returns at most 5 items", () => {
    expect(detectStrengths(baseParams).length).toBeLessThanOrEqual(5);
  });
});

describe("detectWeaknesses", () => {
  const baseParams = {
    languages: { TypeScript: 100 },
    avgRepoScore: 50,
    consistencyScore: 50,
    activeDays: 45,
    totalDays: 90,
    hasReadmeRatio: 0.7,
    totalCommits: 50,
  };

  it("returns an array", () => {
    expect(Array.isArray(detectWeaknesses(baseParams))).toBe(true);
  });

  it("flags low documentation", () => {
    const weaknesses = detectWeaknesses({ ...baseParams, hasReadmeRatio: 0.1 });
    expect(weaknesses.some((w) => w.toLowerCase().includes("doc"))).toBe(true);
  });

  it("flags low consistency", () => {
    const weaknesses = detectWeaknesses({ ...baseParams, consistencyScore: 20 });
    expect(weaknesses.some((w) => w.toLowerCase().includes("inconsistent"))).toBe(true);
  });

  it("returns at most 4 items", () => {
    expect(detectWeaknesses(baseParams).length).toBeLessThanOrEqual(4);
  });
});
