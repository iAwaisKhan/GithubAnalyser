import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { Session } from "next-auth";
import { z } from "zod";
import { authOptions, PLAN_LIMITS } from "@/lib/auth";
import { rateLimitMiddleware } from "@/lib/ratelimit";
import { getCache, setCache, cacheKey, CACHE_TTL } from "@/lib/redis";
import { incrementUsage } from "@/lib/billing";
import { computeRawScore, normalizeScores, RawRepo } from "@/lib/scoring";
import {
  getBatchedAiReviews, getActivityInsight, getBatchedAnalysisAndPersona,
  getResumeBullets, getContributionStory, getGrowthInsight,
  ResumeTone, ResumeRepoInput,
} from "@/lib/ai";
import { buildDailyMap, computeConsistency } from "@/lib/consistency";
import { aggregateLanguages, inferSkills, detectStrengths, detectWeaknesses } from "@/lib/languages";
import { buildTechRadar, inferDomain } from "@/lib/radar";
import { detectPersona, PersonaInput } from "@/lib/persona";
import { getGrowthDiff, getGrowthHistory } from "@/lib/growth";
import { fetchContributionsGraphQL } from "@/lib/graphql";
import { ghHeaders, fetchReadme, fetchEvents as ghFetchEvents } from "@/lib/github";
import pLimit from "p-limit";

// ── Input validation ─────────────────────────────────────────────────────────
const QuerySchema = z.object({
  username: z
    .string()
    .min(1, "Username required")
    .max(39, "GitHub usernames are max 39 chars")
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, "Invalid GitHub username format"),
  tone: z.enum(["formal", "impact", "concise"]).default("formal"),
  refresh: z.string().optional().transform((v) => v === "1"),
});

// README fetches with concurrency ceiling of 4 (fix 3.3)
const readmeLimit = pLimit(4);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Zod input validation (fix 3.7)
  const parsed = QuerySchema.safeParse({
    username: searchParams.get("username")?.trim(),
    tone: searchParams.get("tone") ?? "formal",
    refresh: searchParams.get("refresh") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { username, tone, refresh: bustCache } = parsed.data;
  // ── Auth + plan check ─────────────────────────────────────────────────────
  let session: Session | null = null;
  let plan: "free" | "pro" | "enterprise" | "anonymous" = "anonymous";
  let userId: string | undefined;
  let githubAccessTokenForCache: string | undefined;

  try {
    session = await getServerSession(authOptions);
    plan = (session?.user?.plan ?? "anonymous") as typeof plan;
    userId = session?.user?.id;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    githubAccessTokenForCache = token?.githubAccessToken ?? undefined;
  } catch (e) {
    console.warn("Auth check failed, continuing as anonymous:", e);
  }

  // Enforce per-plan limits for logged-in users
  if (userId && session) {
    const used = session.user.analysesUsed;
    const limit = PLAN_LIMITS[plan] ?? 5;
    if (used >= limit) {
      return NextResponse.json(
        { error: "Monthly analysis limit reached", upgrade_url: "/billing", used, limit },
        { status: 429 }
      );
    }
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  try {
    const rateLimitPlan = (plan === "anonymous" ? "anonymous" : plan) as "free" | "pro" | "enterprise" | "anonymous";
    const rlResult = await rateLimitMiddleware(req, rateLimitPlan, userId ?? undefined);
    if (rlResult) return rlResult;
  } catch (e) {
    console.warn("Rate limit check failed, continuing:", e);
  }

  // ── Cache check — keyed by tier to prevent data leakage (fix 3.4) ─────────
  const authTier = plan === "anonymous" ? "anon" : (githubAccessTokenForCache ? "auth-graphql" : "auth-rest");
  const ck = cacheKey("analysis", authTier, username, tone);
  if (!bustCache) {
    const cached = await getCache<object>(ck);
    if (cached) {
      return NextResponse.json({ ...cached, _cached: true });
    }
  }

  try {
    // ── GitHub data fetch ─────────────────────────────────────────────────────
    const [profileRes, reposRes, rawEvents] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, { headers: ghHeaders }),
      ghFetchEvents(username),
    ]);

    if (profileRes.status === 404) return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });
    if (!profileRes.ok) {
      const err = await profileRes.json();
      return NextResponse.json({ error: err.message || "Failed to fetch profile" }, { status: profileRes.status });
    }

    const profileData = await profileRes.json();
    const reposData: (RawRepo & { topics?: string[] })[] = reposRes.ok ? await reposRes.json() : [];

    const profile = {
      login: profileData.login, avatar_url: profileData.avatar_url,
      name: profileData.name, bio: profileData.bio,
      public_repos: profileData.public_repos, followers: profileData.followers,
      following: profileData.following, html_url: profileData.html_url,
    };

    // ── Repos pipeline ────────────────────────────────────────────────────────
    let repos: object[] = [], readmeRatio = 0, avgRepoScore = 0;
    let top5WithMeta: Array<{
      repo: RawRepo & { topics?: string[] }; score: number;
      has_readme: boolean; readme_excerpt: string | null; has_description: boolean;
    }> = [];

    if (Array.isArray(reposData) && reposData.length > 0) {
      const preScored = reposData.map((repo) => ({ repo, ...computeRawScore(repo, false) }));
      preScored.sort((a, b) => b.raw_score - a.raw_score);
      const candidates = preScored.slice(0, 10);
      const readmeResults = await Promise.all(candidates.map(({ repo }) => readmeLimit(() => fetchReadme(username, repo.name))));
      readmeRatio = readmeResults.filter((r) => r.exists).length / readmeResults.length;

      const withReadme = candidates.map(({ repo }, i) => ({
        repo, readme_excerpt: readmeResults[i].excerpt,
        ...computeRawScore(repo, readmeResults[i].exists),
      }));
      const normalized = normalizeScores(withReadme);
      top5WithMeta = withReadme
        .map((item, i) => ({ ...item, score: normalized[i] }))
        .sort((a, b) => b.score - a.score).slice(0, 5)
        .map((item) => ({
          repo: item.repo, score: item.score,
          has_readme: item.has_readme, readme_excerpt: item.readme_excerpt,
          has_description: item.has_description,
        }));
      avgRepoScore = Math.round(top5WithMeta.reduce((s, r) => s + r.score, 0) / top5WithMeta.length);

      const aiReviews = await getBatchedAiReviews(
        top5WithMeta.map(({ repo }) => ({
          name: repo.name, description: repo.description,
          language: repo.language, stargazers_count: repo.stargazers_count, forks_count: repo.forks_count,
        }))
      );
      repos = top5WithMeta.map(({ repo, score, has_readme, has_description }) => ({
        name: repo.name, score, stars: repo.stargazers_count, forks: repo.forks_count,
        language: repo.language, description: repo.description, html_url: repo.html_url,
        pushed_at: repo.pushed_at, has_readme, has_description,
        ai_review: aiReviews[repo.name] ?? "No AI insights available.",
      }));
    }

    // ── Consistency — GraphQL first, Events API fallback ─────────────────────
    let dailyMap: Record<string, number> = {};
    let gqlPullRequests = 0;
    let gqlIssues = 0;
    let gqlTopics: string[] = [];
    const githubAccessToken = githubAccessTokenForCache;

    if (githubAccessToken || process.env.GITHUB_TOKEN) {
      const gql = await fetchContributionsGraphQL(username, githubAccessToken ?? process.env.GITHUB_TOKEN!);
      if (gql) {
        dailyMap = gql.dailyMap;
        gqlPullRequests = gql.totalPullRequests;
        gqlIssues = gql.totalIssues;
        gqlTopics = gql.topTopics;
      }
    }
    // Fallback to Events API if GraphQL didn't return data
    if (Object.keys(dailyMap).length === 0) {
      dailyMap = buildDailyMap(
        rawEvents as Array<{ type: string; created_at: string; payload?: { commits?: unknown[] } }>
      );
    }

    const consistencyStats = computeConsistency(dailyMap, 90);
    const activityInsight = await getActivityInsight({
      total_commits: consistencyStats.total_commits, active_days: consistencyStats.active_days,
      total_days: consistencyStats.total_days, longest_streak: consistencyStats.longest_streak,
      current_streak: consistencyStats.current_streak,
    });
    const consistency = {
      score: consistencyStats.score, current_streak: consistencyStats.current_streak,
      longest_streak: consistencyStats.longest_streak, active_days: consistencyStats.active_days,
      total_days: consistencyStats.total_days, total_commits: consistencyStats.total_commits,
      heatmap: consistencyStats.heatmap, ai_insight: activityInsight,
    };

    // ── Language + analysis ───────────────────────────────────────────────────
    const languages = aggregateLanguages(Array.isArray(reposData) ? reposData : []);
    const skills = inferSkills(languages);
    const strengths = detectStrengths({ languages, avgRepoScore, consistencyScore: consistencyStats.score, longestStreak: consistencyStats.longest_streak, activeDays: consistencyStats.active_days, totalDays: consistencyStats.total_days, hasReadmeRatio: readmeRatio });
    const weaknesses = detectWeaknesses({ languages, avgRepoScore, consistencyScore: consistencyStats.score, activeDays: consistencyStats.active_days, totalDays: consistencyStats.total_days, hasReadmeRatio: readmeRatio, totalCommits: consistencyStats.total_commits });

    // ── Tech stack radar (2.5) ─────────────────────────────────────────────────
    const radar = buildTechRadar(languages, skills);
    const { domain: strongestDomain, proficiency } = inferDomain(radar);

    // ── Persona ───────────────────────────────────────────────────────────────
    const totalForks = Array.isArray(reposData) ? reposData.reduce((s, r) => s + (r.forks_count ?? 0), 0) : 0;
    const totalStars = Array.isArray(reposData) ? reposData.reduce((s, r) => s + (r.stargazers_count ?? 0), 0) : 0;
    const personaInput: PersonaInput = {
      publicRepos: profileData.public_repos ?? 0, totalForks, totalStars,
      languageCount: Object.keys(languages).length,
      commitFrequency: consistencyStats.total_days > 0 ? consistencyStats.total_commits / consistencyStats.total_days : 0,
      consistencyScore: consistencyStats.score, avgRepoScore, totalCommits: consistencyStats.total_commits,
    };
    const personaData = detectPersona(personaInput);

    // ── Growth tracking ───────────────────────────────────────────────────────
    let growthDiff = null, growthHistory: unknown[] = [], growthInsight = "No growth data available.";
    if (process.env.DATABASE_URL) {
      try {
        const snapshotInput = {
          username, repo_count: profileData.public_repos ?? 0,
          total_stars: totalStars, consistency_score: consistencyStats.score,
          avg_repo_score: avgRepoScore, top_language: Object.keys(languages)[0] ?? null,
        };
        [growthDiff, growthHistory] = await Promise.all([
          getGrowthDiff(username, snapshotInput),
          getGrowthHistory(username),
        ]);
        if (growthDiff) {
          growthInsight = await getGrowthInsight({
            username, repo_growth: growthDiff.repo_growth, stars_growth: growthDiff.stars_growth,
            consistency_change: growthDiff.consistency_change, score_change: growthDiff.score_change,
            snapshots_available: growthDiff.snapshots_available,
            current_consistency: consistencyStats.score, current_avg_score: avgRepoScore,
          });
        }
      } catch (e) { console.warn("Growth tracking unavailable:", e); }
    }

    // ── All parallel AI calls ─────────────────────────────────────────────────
    const resumeInputs: ResumeRepoInput[] = top5WithMeta.map(({ repo, score, readme_excerpt }) => ({
      name: repo.name, description: repo.description, language: repo.language,
      stars: repo.stargazers_count, forks: repo.forks_count,
      topics: repo.topics ?? [], score, readme_excerpt,
    }));

    const [batchedAI, resumeBulletsRaw, story] = await Promise.all([
      getBatchedAnalysisAndPersona(
        { languages, skills, avgRepoScore, consistencyScore: consistencyStats.score, strengths, weaknesses, totalRepos: Array.isArray(reposData) ? reposData.length : 0 },
        { personaType: personaData.type, publicRepos: profileData.public_repos ?? 0, totalCommits: consistencyStats.total_commits, consistencyScore: consistencyStats.score, topLanguages: Object.keys(languages), avgRepoScore }
      ),
      getResumeBullets(resumeInputs, tone),
      getContributionStory({
        username, topLanguages: Object.keys(languages),
        topRepos: top5WithMeta.map(({ repo }) => ({ name: repo.name, description: repo.description, stars: repo.stargazers_count, language: repo.language })),
        totalCommits: consistencyStats.total_commits, consistencyScore: consistencyStats.score,
        personaType: personaData.type, activeDays: consistencyStats.active_days,
        longestStreak: consistencyStats.longest_streak, strengths, publicRepos: profileData.public_repos ?? 0,
      }),
    ]);
    const { summary, personaInsight } = batchedAI;

    // ── Increment usage for authenticated users ───────────────────────────────
    if (userId && process.env.DATABASE_URL) {
      try {
        const usage = await incrementUsage(userId, PLAN_LIMITS[plan] ?? 5);
        if (usage === null) {
          return NextResponse.json(
            { error: "Monthly analysis limit reached", upgrade_url: "/billing" },
            { status: 429 }
          );
        }
      } catch {}
    }

    const result = {
      profile, repos, consistency, languages, skills,
      analysis: { strengths, weaknesses, summary },
      resume_points: resumeBulletsRaw.map((r) => r.bullet),
      persona: { ...personaData, insight: personaInsight },
      card: { username: profile.login, styles: ["minimal", "hacker", "corporate"] },
      growth: { diff: growthDiff, history: growthHistory, insight: growthInsight },
      story,
      collaboration: {
        pull_requests: gqlPullRequests,
        issues: gqlIssues,
        topics: gqlTopics,
      },
      radar: {
        axes: radar,
        strongestDomain,
        proficiency,
      },
    };

    // Cache the result
    await setCache(ck, result, CACHE_TTL.analysis);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GitHub API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
