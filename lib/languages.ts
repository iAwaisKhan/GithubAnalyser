export interface LanguageBreakdown {
  [language: string]: number; // percentage 0–100
}

export interface SkillMapping {
  language: string;
  skill: string;
  category: string;
}

// Language → skill/category mapping
const SKILL_MAP: Record<string, { skill: string; category: string }> = {
  JavaScript:  { skill: "Frontend / Fullstack Development", category: "web" },
  TypeScript:  { skill: "Typed Fullstack Development",     category: "web" },
  Python:      { skill: "Backend / Data Engineering",       category: "backend" },
  Rust:        { skill: "Systems Programming",              category: "systems" },
  Go:          { skill: "Distributed Systems / DevOps",     category: "systems" },
  Java:        { skill: "Enterprise Systems",               category: "enterprise" },
  Kotlin:      { skill: "Android / JVM Development",        category: "mobile" },
  Swift:       { skill: "iOS / macOS Development",          category: "mobile" },
  "C++":       { skill: "DSA / Competitive Programming",    category: "systems" },
  C:           { skill: "Low-level / Embedded Systems",     category: "systems" },
  Ruby:        { skill: "Web Backend (Rails ecosystem)",    category: "backend" },
  PHP:         { skill: "Web Backend / CMS Development",    category: "backend" },
  Dart:        { skill: "Cross-platform Mobile (Flutter)",  category: "mobile" },
  Shell:       { skill: "DevOps / Scripting",               category: "devops" },
  HTML:        { skill: "Web Markup / Templating",          category: "web" },
  CSS:         { skill: "UI Styling / Design Systems",      category: "web" },
  R:           { skill: "Data Science / Statistics",        category: "data" },
  Scala:       { skill: "Functional / Big Data Engineering",category: "data" },
  Haskell:     { skill: "Functional Programming",           category: "academic" },
  Elixir:      { skill: "Concurrent / Real-time Systems",   category: "backend" },
  "Jupyter Notebook": { skill: "Data Science / ML Research", category: "data" },
};

/** Aggregate repo languages into a sorted percentage map */
export function aggregateLanguages(
  repos: Array<{ language: string | null }>
): LanguageBreakdown {
  const counts: Record<string, number> = {};

  for (const repo of repos) {
    if (!repo.language) continue;
    counts[repo.language] = (counts[repo.language] ?? 0) + 1;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return {};

  // Sort descending, keep top 8
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Re-sum after slice for accurate %
  const slicedTotal = sorted.reduce((a, [, v]) => a + v, 0);

  return Object.fromEntries(
    sorted.map(([lang, count]) => [
      lang,
      Math.round((count / slicedTotal) * 100),
    ])
  );
}

/** Derive inferred skills from language breakdown */
export function inferSkills(languages: LanguageBreakdown): string[] {
  return Object.keys(languages)
    .map((lang) => SKILL_MAP[lang]?.skill)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe
}

/** Rule-based strengths from data signals */
export function detectStrengths(params: {
  languages: LanguageBreakdown;
  avgRepoScore: number;
  consistencyScore: number;
  longestStreak: number;
  activeDays: number;
  totalDays: number;
  hasReadmeRatio: number;
}): string[] {
  const strengths: string[] = [];
  const topLangs = Object.keys(params.languages);

  // Language strengths
  const hasWeb = topLangs.some((l) => ["JavaScript", "TypeScript", "HTML", "CSS"].includes(l));
  const hasBackend = topLangs.some((l) => ["Python", "Go", "Ruby", "Java", "Elixir"].includes(l));
  const hasSystems = topLangs.some((l) => ["Rust", "C", "C++"].includes(l));
  const hasData = topLangs.some((l) => ["Python", "R", "Scala", "Jupyter Notebook"].includes(l));
  const hasFullstack = hasWeb && hasBackend;

  if (hasFullstack) strengths.push("Well-rounded fullstack capability");
  else if (hasWeb) strengths.push("Strong frontend / web development skills");
  else if (hasBackend) strengths.push("Solid backend engineering foundation");
  if (hasSystems) strengths.push("Systems-level programming proficiency");
  if (hasData) strengths.push("Data engineering / analysis capability");

  // Activity strengths
  if (params.consistencyScore >= 65) strengths.push("Highly consistent contribution habits");
  if (params.longestStreak >= 14) strengths.push(`Sustained focus (${params.longestStreak}-day streak)`);
  if (params.activeDays / params.totalDays >= 0.5) strengths.push("Active codebase engagement");

  // Quality strengths
  if (params.avgRepoScore >= 70) strengths.push("High-quality, well-starred repositories");
  if (params.hasReadmeRatio >= 0.8) strengths.push("Strong documentation practices");

  return strengths.slice(0, 5);
}

/** Rule-based weaknesses from data signals */
export function detectWeaknesses(params: {
  languages: LanguageBreakdown;
  avgRepoScore: number;
  consistencyScore: number;
  activeDays: number;
  totalDays: number;
  hasReadmeRatio: number;
  totalCommits: number;
}): string[] {
  const weaknesses: string[] = [];
  const topLangs = Object.keys(params.languages);

  // Specialization flags
  const domLangPct = Object.values(params.languages)[0] ?? 0;
  if (domLangPct >= 80 && topLangs.length <= 2) {
    weaknesses.push(`Limited language diversity (heavy ${topLangs[0] ?? ""} focus)`);
  }

  const hasWeb = topLangs.some((l) => ["JavaScript", "TypeScript", "HTML", "CSS"].includes(l));
  const hasBackend = topLangs.some((l) => ["Python", "Go", "Ruby", "Java"].includes(l));
  if (hasWeb && !hasBackend) weaknesses.push("Limited backend / server-side exposure");
  if (hasBackend && !hasWeb) weaknesses.push("Limited frontend / UI development exposure");

  // Activity weaknesses
  if (params.consistencyScore < 35) weaknesses.push("Inconsistent contribution patterns");
  if (params.activeDays / params.totalDays < 0.2) weaknesses.push("Low overall activity frequency");
  if (params.totalCommits < 20) weaknesses.push("Low commit volume in recent history");

  // Quality weaknesses
  if (params.hasReadmeRatio < 0.4) weaknesses.push("Poor documentation coverage (missing READMEs)");
  if (params.avgRepoScore < 40) weaknesses.push("Repositories lack community traction (low stars/forks)");

  return weaknesses.slice(0, 4);
}
