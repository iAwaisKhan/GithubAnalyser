import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, PLAN_LIMITS } from "@/lib/auth";
import { rateLimitMiddleware } from "@/lib/ratelimit";
import { getCache, setCache, cacheKey, CACHE_TTL } from "@/lib/redis";
import { incrementUsage } from "@/lib/billing";
import { computeRawScore, normalizeScores, RawRepo } from "@/lib/scoring";
import {
  getAiReviews, getActivityInsight, getDeveloperAnalysis,
  getResumeBullets, getPersonaInsight, getGrowthInsight, getContributionStory,
  ResumeTone, ResumeRepoInput,
} from "@/lib/ai";
import { buildDailyMap, computeConsistency } from "@/lib/consistency";
import { aggregateLanguages, inferSkills, detectStrengths, detectWeaknesses } from "@/lib/languages";
import { detectPersona, PersonaInput } from "@/lib/persona";
import { getGrowthDiff, getGrowthHistory } from "@/lib/growth";
import { fetchContributionsGraphQL } from "@/lib/graphql";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ghHeaders: HeadersInit = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
};

async function checkReadme(username: string, repoName: string) {
  try {
    const res = await fetch(`https://api.github.com/repos/${username}/${repoName}/readme`, { headers: ghHeaders });
    if (!res.ok) return { exists: false, excerpt: null };
    const data = await res.json();
    const raw = Buffer.from(data.content ?? "", "base64").toString("utf-8");
    const excerpt = raw.replace(/[#*`>\[\]!]/g, "").replace(/\n+/g, " ").trim().slice(0, 300) || null;
    return { exists: true, excerpt };
  } catch { return { exists: false, excerpt: null }; }
}

async function fetchEvents(username: string): Promise<unknown[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      fetch(`https://api.github.com/users/${username}/events?per_page=100&page=${page}`, { headers: ghHeaders })
        .then((r) => (r.ok ? r.json() : []))
    )
  );
  return pages.flat();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim();
  const tone = (searchParams.get("tone") ?? "formal") as ResumeTone;
  const bustCache = searchParams.get("refresh") === "1";

  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });

  // ── Auth + plan check ─────────────────────────────────────────────────────
  let session: { user: { id: string; plan: string; analysesUsed: number; analysesLimit: number; stripeCustomerId?: string | null; githubUsername?: string | null; name?: string | null; email?: string | null; image?: string | null } } | null = null;
  let plan: "free" | "pro" | "enterprise" | "anonymous" = "anonymous";
  let userId: string | undefined;

  try {
    session = await getServerSession(authOptions);
    plan = (session?.user?.plan ?? "anonymous") as typeof plan;
    userId = session?.user?.id;
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

  // ── Cache check ───────────────────────────────────────────────────────────
  const ck = cacheKey("analysis", username, tone);
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
      fetchEvents(username),
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
      const readmeResults = await Promise.all(candidates.map(({ repo }) => checkReadme(username, repo.name)));
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

      const aiReviews = await getAiReviews(
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
    let totalContributions = 0;
    const githubAccessToken = (session as { accessToken?: string } | null)?.accessToken;

    if (githubAccessToken || GITHUB_TOKEN) {
      const gql = await fetchContributionsGraphQL(username, githubAccessToken ?? GITHUB_TOKEN!);
      if (gql) {
        dailyMap = gql.dailyMap;
        totalContributions = gql.totalContributions;
      }
    }
    // Fallback to Events API if GraphQL didn't return data
    if (Object.keys(dailyMap).length === 0) {
      dailyMap = buildDailyMap(
        rawEvents as Array<{ type: string; created_at: string; payload?: { commits?: unknown[] } }>
      );
    }

    const consistencyStats = computeConsistency(dailyMap, 90);
    // Use GraphQL total if available (more accurate)
    if (totalContributions > 0) {
      (consistencyStats as typeof consistencyStats & { total_commits: number }).total_commits = totalContributions;
    }

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

    // ── Persona ───────────────────────────────────────────────────────────────
    const totalForks = Array.isArray(reposData) ? reposData.reduce((s, r) => s + (r.forks_count ?? 0), 0) : 0;
    const totalStars = Array.isArray(reposData) ? reposData.reduce((s, r) => s + (r.stargazers_count ?? 0), 0) : 0;
    const personaInput: PersonaInput = {
      publicRepos: profileData.public_repos ?? 0, totalForks, totalStars,
      languageCount: Object.keys(languages).length,
      commitFrequency: consistencyStats.active_days > 0 ? consistencyStats.total_commits / consistencyStats.active_days : 0,
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

    const [summary, resumeBulletsRaw, personaInsight, story] = await Promise.all([
      getDeveloperAnalysis({ languages, skills, avgRepoScore, consistencyScore: consistencyStats.score, strengths, weaknesses, totalRepos: Array.isArray(reposData) ? reposData.length : 0 }),
      getResumeBullets(resumeInputs, tone),
      getPersonaInsight({ personaType: personaData.type, publicRepos: profileData.public_repos ?? 0, totalCommits: consistencyStats.total_commits, consistencyScore: consistencyStats.score, topLanguages: Object.keys(languages), avgRepoScore }),
      getContributionStory({
        username, topLanguages: Object.keys(languages),
        topRepos: top5WithMeta.map(({ repo }) => ({ name: repo.name, description: repo.description, stars: repo.stargazers_count, language: repo.language })),
        totalCommits: consistencyStats.total_commits, consistencyScore: consistencyStats.score,
        personaType: personaData.type, activeDays: consistencyStats.active_days,
        longestStreak: consistencyStats.longest_streak, strengths, publicRepos: profileData.public_repos ?? 0,
      }),
    ]);

    // ── Increment usage for authenticated users ───────────────────────────────
    if (userId && process.env.DATABASE_URL) {
      try { await incrementUsage(userId); } catch {}
    }

    const result = {
      profile, repos, consistency, languages, skills,
      analysis: { strengths, weaknesses, summary },
      resume_points: resumeBulletsRaw.map((r) => r.bullet),
      persona: { ...personaData, insight: personaInsight },
      card: { username: profile.login, styles: ["minimal", "hacker", "corporate"] },
      growth: { diff: growthDiff, history: growthHistory, insight: growthInsight },
      story,
    };

    // Cache the result
    await setCache(ck, result, CACHE_TTL.analysis);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GitHub API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
