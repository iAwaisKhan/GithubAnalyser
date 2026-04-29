interface RepoInput {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

interface ActivityInput {
  total_commits: number;
  active_days: number;
  total_days: number;
  longest_streak: number;
  current_streak: number;
}

interface DeveloperAnalysisInput {
  languages: Record<string, number>;
  skills: string[];
  avgRepoScore: number;
  consistencyScore: number;
  strengths: string[];
  weaknesses: string[];
  totalRepos: number;
}

export interface ResumeRepoInput {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  score: number;
  readme_excerpt: string | null;
}

export type ResumeTone = "formal" | "impact" | "concise";

const FALLBACK_REPO     = "No AI insights available.";
const FALLBACK_ACTIVITY = "No activity insights available.";
const FALLBACK_ANALYSIS = "Analysis unavailable at the moment.";
const FALLBACK_RESUME   = "Resume insights unavailable.";

async function callClaude(prompt: string, maxTokens = 120): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return "";
  const data = await res.json();
  return data?.content?.[0]?.text?.trim() ?? "";
}

export async function getAiReview(repo: RepoInput): Promise<string> {
  try {
    const text = await callClaude(
      `Evaluate this GitHub repository for code quality, usefulness, and professionalism. Give a short 1-2 line assessment only — no preamble, no labels.

Repository:
- Name: ${repo.name}
- Description: ${repo.description || "None"}
- Language: ${repo.language || "Unknown"}
- Stars: ${repo.stargazers_count}
- Forks: ${repo.forks_count}`
    );
    return text || FALLBACK_REPO;
  } catch {
    return FALLBACK_REPO;
  }
}

export async function getAiReviews(repos: RepoInput[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    repos.map(async (repo) => [repo.name, await getAiReview(repo)] as const)
  );
  return Object.fromEntries(entries);
}

export async function getActivityInsight(stats: ActivityInput): Promise<string> {
  try {
    const inactive_days = stats.total_days - stats.active_days;
    const text = await callClaude(
      `Analyze this developer's GitHub activity and describe their consistency, work habits, and discipline in 1-2 lines only — no preamble, no labels.

Activity (last ${stats.total_days} days):
- Total commits: ${stats.total_commits}
- Active days: ${stats.active_days}
- Inactive days: ${inactive_days}
- Current streak: ${stats.current_streak} days
- Longest streak: ${stats.longest_streak} days`,
      140
    );
    return text || FALLBACK_ACTIVITY;
  } catch {
    return FALLBACK_ACTIVITY;
  }
}

export async function getDeveloperAnalysis(input: DeveloperAnalysisInput): Promise<string> {
  try {
    const langList = Object.entries(input.languages)
      .map(([l, p]) => `${l}: ${p}%`)
      .join(", ");

    const text = await callClaude(
      `Analyze this developer's GitHub profile. Identify their overall technical profile, potential, and growth areas in 2-3 concise professional sentences. No preamble, no labels, no bullet points.

Profile data:
- Languages: ${langList}
- Inferred skills: ${input.skills.join(", ") || "N/A"}
- Average repo quality score: ${input.avgRepoScore}/100
- Contribution consistency score: ${input.consistencyScore}/100
- Total public repos analyzed: ${input.totalRepos}
- Detected strengths: ${input.strengths.join("; ") || "N/A"}
- Detected weaknesses: ${input.weaknesses.join("; ") || "N/A"}`,
      220
    );
    return text || FALLBACK_ANALYSIS;
  } catch {
    return FALLBACK_ANALYSIS;
  }
}

// ── Resume bullet helpers ─────────────────────────────────────────────────────

/** Infer extra tech keywords from description + topics */
function inferTechContext(repo: ResumeRepoInput): string {
  const tokens = [
    repo.description ?? "",
    ...(repo.topics ?? []),
    repo.readme_excerpt ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const hints: string[] = [];
  if (/\bchat|websocket|real.?time\b/.test(tokens)) hints.push("WebSockets");
  if (/\bml|machine.?learn|neural|tensorflow|pytorch\b/.test(tokens))
    hints.push("Machine Learning");
  if (/\bdocker|container|kubernetes|k8s\b/.test(tokens)) hints.push("Docker");
  if (/\bci\/cd|github.?action|pipeline\b/.test(tokens)) hints.push("CI/CD");
  if (/\brest|api|endpoint\b/.test(tokens)) hints.push("REST API");
  if (/\bgraphql\b/.test(tokens)) hints.push("GraphQL");
  if (/\bpostgres|mysql|sqlite|database|sql\b/.test(tokens)) hints.push("SQL");
  if (/\bmongo|nosql\b/.test(tokens)) hints.push("MongoDB");
  if (/\bredis|cache\b/.test(tokens)) hints.push("Redis");
  if (/\baws|gcp|azure|cloud\b/.test(tokens)) hints.push("Cloud");
  if (/\bauth|jwt|oauth\b/.test(tokens)) hints.push("Authentication");
  if (/\breact|vue|angular|next\b/.test(tokens)) hints.push("React/Next.js");

  return hints.length > 0 ? `Inferred additional tech: ${hints.join(", ")}` : "";
}

function toneInstruction(tone: ResumeTone): string {
  switch (tone) {
    case "impact":
      return "Focus heavily on measurable impact, scale, and business value. Use strong action verbs like Architected, Engineered, Scaled.";
    case "concise":
      return "Be extremely concise — maximum 1 line. Strip all filler words.";
    default: // formal
      return "Use formal professional language suitable for a senior engineering resume.";
  }
}

async function getResumeBullet(
  repo: ResumeRepoInput,
  tone: ResumeTone
): Promise<string> {
  const techHint = inferTechContext(repo);
  const topics =
    repo.topics?.length > 0 ? repo.topics.join(", ") : "none listed";

  try {
    const text = await callClaude(
      `Convert this GitHub project into a strong resume bullet point.

Rules:
- Start with an action verb (Built, Developed, Designed, Architected, Engineered, Created, Implemented)
- Mention key technologies used
- Describe the purpose or problem solved
- Include measurable impact if inferable (stars = community adoption, forks = reuse)
- 1-2 lines maximum, no asterisks, no markdown, no labels
- ${toneInstruction(tone)}

Project:
- Name: ${repo.name}
- Description: ${repo.description || "No description provided"}
- Primary language: ${repo.language || "Unknown"}
- Topics/tags: ${topics}
- Stars: ${repo.stars} (community interest indicator)
- Forks: ${repo.forks} (reuse/collaboration indicator)
- Quality score: ${repo.score}/100
${techHint ? `- ${techHint}` : ""}
${repo.readme_excerpt ? `- README excerpt: "${repo.readme_excerpt.slice(0, 200)}"` : ""}`,
      160
    );
    return text || FALLBACK_RESUME;
  } catch {
    return FALLBACK_RESUME;
  }
}

export async function getResumeBullets(
  repos: ResumeRepoInput[],
  tone: ResumeTone = "formal"
): Promise<Array<{ repo: string; bullet: string }>> {
  const results = await Promise.all(
    repos.map(async (repo) => ({
      repo: repo.name,
      bullet: await getResumeBullet(repo, tone),
    }))
  );
  return results;
}


// ── Persona insight ───────────────────────────────────────────────────────────

export interface PersonaInsightInput {
  personaType: string;
  publicRepos: number;
  totalCommits: number;
  consistencyScore: number;
  topLanguages: string[];
  avgRepoScore: number;
}

export async function getPersonaInsight(input: PersonaInsightInput): Promise<string> {
  const FALLBACK = `You are ${input.personaType} — a developer with a unique and evolving technical identity.`;
  try {
    const text = await callClaude(
      `Based on this GitHub profile data, write a single punchy sentence that starts with "You are ${input.personaType} —" and explains their developer identity and what makes them distinctive. No preamble, no quotes, no extra lines.

Data:
- Persona type: ${input.personaType}
- Public repos: ${input.publicRepos}
- Total recent commits: ${input.totalCommits}
- Consistency score: ${input.consistencyScore}/100
- Top languages: ${input.topLanguages.slice(0, 3).join(", ")}
- Avg repo quality: ${input.avgRepoScore}/100`,
      100
    );
    return text || FALLBACK;
  } catch {
    return FALLBACK;
  }
}


// ── Growth insight ────────────────────────────────────────────────────────────

export interface GrowthInsightInput {
  username: string;
  repo_growth: number;
  stars_growth: number;
  consistency_change: number;
  score_change: number;
  snapshots_available: number;
  current_consistency: number;
  current_avg_score: number;
}

export async function getGrowthInsight(input: GrowthInsightInput): Promise<string> {
  const FALLBACK = "No growth data available yet — analyze again later to track your progress.";
  if (input.snapshots_available < 2) return FALLBACK;
  try {
    const text = await callClaude(
      `Analyze this developer's progress between their last two GitHub profile scans and provide 1-2 actionable sentences of insight and encouragement. No preamble, no bullet points, no labels.

Changes since last scan:
- Repositories: ${input.repo_growth >= 0 ? "+" : ""}${input.repo_growth}
- Total stars: ${input.stars_growth >= 0 ? "+" : ""}${input.stars_growth}
- Consistency score: ${input.consistency_change >= 0 ? "+" : ""}${input.consistency_change} (now ${input.current_consistency}/100)
- Repo quality score: ${input.score_change >= 0 ? "+" : ""}${input.score_change} (now ${input.current_avg_score}/100)`,
      160
    );
    return text || FALLBACK;
  } catch { return FALLBACK; }
}

// ── Compare insight ───────────────────────────────────────────────────────────

export interface CompareInsightInput {
  user1: string; user2: string;
  repos1: number; repos2: number;
  stars1: number; stars2: number;
  consistency1: number; consistency2: number;
  score1: number; score2: number;
  langs1: string[]; langs2: string[];
  persona1: string; persona2: string;
}

export async function getCompareInsight(input: CompareInsightInput): Promise<string> {
  const FALLBACK = "No comparison insights available.";
  try {
    const text = await callClaude(
      `Compare these two GitHub developers and summarize their strengths and key differences in 2 sentences. Be direct and specific. No preamble, no labels, no bullet points.

${input.user1}: ${input.repos1} repos, ${input.stars1} stars, consistency ${input.consistency1}/100, quality ${input.score1}/100, persona: ${input.persona1}, languages: ${input.langs1.slice(0,3).join(", ")}
${input.user2}: ${input.repos2} repos, ${input.stars2} stars, consistency ${input.consistency2}/100, quality ${input.score2}/100, persona: ${input.persona2}, languages: ${input.langs2.slice(0,3).join(", ")}`,
      200
    );
    return text || FALLBACK;
  } catch { return FALLBACK; }
}

// ── Contribution story ────────────────────────────────────────────────────────

export interface StoryInput {
  username: string;
  topLanguages: string[];
  topRepos: Array<{ name: string; description: string | null; stars: number; language: string | null }>;
  totalCommits: number;
  consistencyScore: number;
  personaType: string;
  activeDays: number;
  longestStreak: number;
  strengths: string[];
  publicRepos: number;
}

export async function getContributionStory(input: StoryInput): Promise<string> {
  const FALLBACK = "No story generated — not enough data to narrate your journey yet.";
  try {
    const repoList = input.topRepos
      .slice(0, 4)
      .map((r) => `"${r.name}" (${r.language ?? "unknown"}, ${r.stars}★)${r.description ? `: ${r.description}` : ""}`)
      .join("; ");

    const text = await callClaude(
      `Turn this developer's GitHub journey into a compelling 3-4 sentence narrative story. Describe their evolution, skills, and trajectory in an engaging, personal tone — like the opening of a developer portfolio. No preamble, no labels, no bullet points.

Developer: ${input.username}
Persona: ${input.personaType}
Languages used: ${input.topLanguages.slice(0, 5).join(", ")}
Key projects: ${repoList}
Total recent commits: ${input.totalCommits}
Consistency score: ${input.consistencyScore}/100
Active days (90-day window): ${input.activeDays}
Longest streak: ${input.longestStreak} days
Strengths: ${input.strengths.slice(0, 3).join("; ")}
Public repos: ${input.publicRepos}`,
      280
    );
    return text || FALLBACK;
  } catch { return FALLBACK; }
}
