import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimitMiddleware } from "@/lib/ratelimit";
import { getCache, setCache, cacheKey, CACHE_TTL } from "@/lib/redis";
import { computeRawScore, normalizeScores, RawRepo } from "@/lib/scoring";
import { buildDailyMap, computeConsistency } from "@/lib/consistency";
import { aggregateLanguages } from "@/lib/languages";
import { detectPersona, PersonaInput } from "@/lib/persona";
import { getCompareInsight } from "@/lib/ai";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ghHeaders: HeadersInit = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
};

async function fetchEvents(username: string): Promise<unknown[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      fetch(`https://api.github.com/users/${username}/events?per_page=100&page=${page}`, { headers: ghHeaders })
        .then((r) => (r.ok ? r.json() : []))
    )
  );
  return pages.flat();
}

async function buildUserProfile(username: string) {
  const [profileRes, reposRes, rawEvents] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders }),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, { headers: ghHeaders }),
    fetchEvents(username),
  ]);

  if (profileRes.status === 404) throw new Error(`User "${username}" not found`);
  if (!profileRes.ok) throw new Error(`Failed to fetch profile for "${username}"`);

  const profileData = await profileRes.json();
  const reposData: RawRepo[] = reposRes.ok ? await reposRes.json() : [];

  let avgRepoScore = 0;
  if (Array.isArray(reposData) && reposData.length > 0) {
    const scored = reposData.map((repo) => ({ repo, ...computeRawScore(repo, false) }));
    scored.sort((a, b) => b.raw_score - a.raw_score);
    const top5 = scored.slice(0, 5);
    const normalized = normalizeScores(top5);
    avgRepoScore = Math.round(normalized.reduce((s, n) => s + n, 0) / normalized.length);
  }

  const dailyMap = buildDailyMap(
    rawEvents as Array<{ type: string; created_at: string; payload?: { commits?: unknown[] } }>
  );
  const consistencyStats = computeConsistency(dailyMap, 90);
  const languages = aggregateLanguages(Array.isArray(reposData) ? reposData : []);

  const totalStars = Array.isArray(reposData) ? reposData.reduce((s, r) => s + (r.stargazers_count ?? 0), 0) : 0;
  const totalForks = Array.isArray(reposData) ? reposData.reduce((s, r) => s + (r.forks_count ?? 0), 0) : 0;

  const personaInput: PersonaInput = {
    publicRepos: profileData.public_repos ?? 0, totalForks, totalStars,
    languageCount: Object.keys(languages).length,
    commitFrequency: consistencyStats.active_days > 0 ? consistencyStats.total_commits / consistencyStats.active_days : 0,
    consistencyScore: consistencyStats.score, avgRepoScore, totalCommits: consistencyStats.total_commits,
  };
  const persona = detectPersona(personaInput);

  return {
    username: profileData.login, avatar_url: profileData.avatar_url, name: profileData.name,
    public_repos: profileData.public_repos ?? 0, followers: profileData.followers ?? 0,
    total_stars: totalStars, total_forks: totalForks,
    top_languages: Object.keys(languages).slice(0, 5),
    consistency_score: consistencyStats.score, avg_repo_score: avgRepoScore,
    current_streak: consistencyStats.current_streak, longest_streak: consistencyStats.longest_streak,
    total_commits: consistencyStats.total_commits, persona: persona.type, persona_emoji: persona.emoji,
  };
}

type UserProfile = Awaited<ReturnType<typeof buildUserProfile>>;

function buildComparison(u1: UserProfile, u2: UserProfile) {
  const metrics = [
    { key: "public_repos", label: "Repositories", unit: "" },
    { key: "total_stars", label: "Total Stars", unit: "★" },
    { key: "consistency_score", label: "Consistency", unit: "/100" },
    { key: "avg_repo_score", label: "Repo Quality", unit: "/100" },
    { key: "current_streak", label: "Current Streak", unit: "d" },
    { key: "longest_streak", label: "Longest Streak", unit: "d" },
    { key: "followers", label: "Followers", unit: "" },
    { key: "total_commits", label: "Recent Commits (90d)", unit: "" },
  ] as const;

  const breakdown = metrics.map(({ key, label, unit }) => {
    const v1 = u1[key] as number;
    const v2 = u2[key] as number;
    return { metric: label, unit, user1: v1, user2: v2, winner: v1 > v2 ? "user1" : v2 > v1 ? "user2" : "tie" as const };
  });

  return {
    breakdown,
    user1_wins: breakdown.filter((b) => b.winner === "user1").length,
    user2_wins: breakdown.filter((b) => b.winner === "user2").length,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user1 = searchParams.get("user1")?.trim();
  const user2 = searchParams.get("user2")?.trim();

  if (!user1 || !user2) return NextResponse.json({ error: "Both user1 and user2 are required" }, { status: 400 });
  if (user1.toLowerCase() === user2.toLowerCase()) return NextResponse.json({ error: "Please enter two different usernames" }, { status: 400 });

  let session: any = null;
  try {
    const s = await getServerSession(authOptions);
    if (s) session = s;
  } catch (e) {
    console.warn("Auth check failed in compare:", e);
  }
  const plan = (session?.user?.plan ?? "anonymous") as "free" | "pro" | "enterprise" | "anonymous";
  const sessionUserId = session?.user?.id;

  // Free users can't use compare — require at least pro
  if (!sessionUserId) {
    return NextResponse.json({ error: "Sign in required for Compare Mode", signin_url: "/auth/signin" }, { status: 401 });
  }
  if (plan === "free") {
    return NextResponse.json({ error: "Compare Mode requires Pro plan", upgrade_url: "/billing" }, { status: 403 });
  }

  try {
    const rlResult = await rateLimitMiddleware(req, plan as "free" | "pro" | "enterprise" | "anonymous", sessionUserId);
    if (rlResult) return rlResult;
  } catch (e) {
    console.warn("Rate limit check failed in compare:", e);
  }

  const ck = cacheKey("compare", [user1, user2].sort().join(":"));
  const cached = await getCache<object>(ck);
  if (cached) return NextResponse.json({ ...cached, _cached: true });

  try {
    const [profile1, profile2] = await Promise.all([buildUserProfile(user1), buildUserProfile(user2)]);
    const comparison = buildComparison(profile1, profile2);
    const insight = await getCompareInsight({
      user1: profile1.username, user2: profile2.username,
      repos1: profile1.public_repos, repos2: profile2.public_repos,
      stars1: profile1.total_stars, stars2: profile2.total_stars,
      consistency1: profile1.consistency_score, consistency2: profile2.consistency_score,
      score1: profile1.avg_repo_score, score2: profile2.avg_repo_score,
      langs1: profile1.top_languages, langs2: profile2.top_languages,
      persona1: profile1.persona, persona2: profile2.persona,
    });

    const result = { user1: profile1, user2: profile2, comparison, insight };
    await setCache(ck, result, CACHE_TTL.compare);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
