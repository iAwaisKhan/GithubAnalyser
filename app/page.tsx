"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AuthHeader from "@/components/AuthHeader";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AnalysisSkeleton } from "@/components/Skeletons";
import GithubForm from "@/components/GithubForm";
import ProfileCard from "@/components/ProfileCard";
import RepoCard from "@/components/RepoCard";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import LanguageChart from "@/components/LanguageChart";
import StrengthWeakness from "@/components/StrengthWeakness";
import ResumeSection from "@/components/ResumeSection";
import PersonaBadge from "@/components/PersonaBadge";
import ProfileCardPreview from "@/components/ProfileCardPreview";
import GrowthTracker from "@/components/GrowthTracker";
import StorySection from "@/components/StorySection";

type Tone = "formal" | "impact" | "concise";

interface Profile { login: string; avatar_url: string; name: string | null; bio: string | null; public_repos: number; followers: number; following: number; html_url: string; }
interface Repo { name: string; score: number; stars: number; forks: number; language: string | null; description: string | null; html_url: string; pushed_at: string | null; has_readme: boolean; has_description: boolean; ai_review: string; }
interface DayEntry { date: string; count: number; }
interface ConsistencyData { score: number; current_streak: number; longest_streak: number; active_days: number; total_days: number; total_commits: number; heatmap: DayEntry[]; ai_insight: string; }
interface Analysis { strengths: string[]; weaknesses: string[]; summary: string; }
interface Persona { type: string; emoji: string; description: string; traits: string[]; insight: string; }
interface Snapshot { id: number; username: string; repo_count: number; total_stars: number; consistency_score: number; avg_repo_score: number; top_language: string | null; created_at: string; }
interface GrowthDiff { repo_growth: number; stars_growth: number; consistency_change: number; score_change: number; snapshots_available: number; latest: Snapshot; previous: Snapshot | null; }
interface ApiData { profile: Profile; repos: Repo[]; consistency: ConsistencyData; languages: Record<string, number>; skills: string[]; analysis: Analysis; resume_points: string[]; persona: Persona; growth: { diff: GrowthDiff | null; history: Snapshot[]; insight: string }; story: string; }

const LOADING_STEPS = [
  "fetching github profile...",
  "scoring repositories + reading READMEs...",
  "analyzing contribution history...",
  "mapping languages · detecting persona · saving snapshot...",
  "generating ai insights, resume bullets, story...",
];

export default function Home() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [data, setData] = useState<ApiData | null>(null);
  const [resumePoints, setResumePoints] = useState<string[]>([]);
  const [lastUsername, setLastUsername] = useState("");

  const fetchData = useCallback(async (username: string, tone: Tone = "formal") => {
    const res = await fetch(`/api/github?username=${encodeURIComponent(username)}&tone=${tone}`);
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json.error || "Something went wrong") as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    return json as ApiData;
  }, []);

  const handleSubmit = async (username: string) => {
    setLoading(true); setError(null); setErrorCode(null); setData(null);
    setResumePoints([]); setLoadingStep(0); setLastUsername(username);
    const interval = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1400);
    try {
      const json = await fetchData(username, "formal");
      setData(json); setResumePoints(json.resume_points ?? []);
    } catch (e) {
      const err = e as Error & { status?: number };
      setError(err.message ?? "Network error");
      setErrorCode(err.status ?? null);
    } finally { clearInterval(interval); setLoading(false); }
  };

  const handleRegenerate = useCallback(async (tone: Tone) => {
    if (!lastUsername) return;
    try { const json = await fetchData(lastUsername, tone); setResumePoints(json.resume_points ?? []); } catch {}
  }, [lastUsername, fetchData]);

  const cardData = data ? {
    username: data.profile.login, name: data.profile.name, avatar_url: data.profile.avatar_url,
    topLanguages: Object.keys(data.languages).slice(0, 5),
    avgRepoScore: data.repos.length > 0 ? Math.round(data.repos.reduce((s, r) => s + r.score, 0) / data.repos.length) : 0,
    consistencyScore: data.consistency.score, topStrength: data.analysis.strengths[0] ?? "",
    resumeHighlight: resumePoints[0] ?? "", persona: data.persona,
    bio: data.profile.bio ?? data.analysis.summary ?? "",
  } : null;

  return (
    <main className="min-h-screen bg-[#080c08] text-green-400 flex flex-col items-center px-4 py-16">
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,0.3) 2px,rgba(0,255,0,0.3) 4px)" }} />

      <AuthHeader />

      <div className="text-center mb-10">
        <div className="font-mono text-xs text-green-800 tracking-[0.3em] uppercase mb-3">v8.0.0 — production ready</div>
        <h1 className="font-mono text-3xl md:text-4xl font-bold text-green-400 tracking-tight">
          <span className="text-green-600">&gt;</span> github_analyzer<span className="animate-blink text-green-500">_</span>
        </h1>
        <p className="font-mono text-sm text-green-700 mt-3">// full-stack developer intelligence platform</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/compare" className="font-mono text-xs text-green-800 border border-green-500/20 px-3 py-1.5 hover:border-green-500/40 hover:text-green-600 transition-colors">
            ⚔️ compare →
          </Link>
          <Link href="/dashboard" className="font-mono text-xs text-green-800 border border-green-500/20 px-3 py-1.5 hover:border-green-500/40 hover:text-green-600 transition-colors">
            dashboard →
          </Link>
          {!session && (
            <Link href="/auth/signin" className="font-mono text-xs text-green-600 border border-green-500/30 px-3 py-1.5 hover:border-green-400/60 transition-colors">
              sign in
            </Link>
          )}
        </div>
      </div>

      {/* Usage warning */}
      {session && session.user.analysesUsed >= session.user.analysesLimit && (
        <div className="w-full max-w-xl mb-6 border border-red-500/40 bg-red-500/5 px-5 py-3 font-mono text-xs text-red-400">
          Monthly limit reached ({session.user.analysesLimit} analyses).{" "}
          <Link href="/billing" className="underline hover:text-red-300">Upgrade your plan →</Link>
        </div>
      )}

      <GithubForm onSubmit={handleSubmit} loading={loading} />

      {/* Loading */}
      {loading && (
        <div className="w-full max-w-xl mt-10 space-y-2">
          {LOADING_STEPS.map((step, i) => (
            <div key={step} className={`flex items-center gap-3 font-mono text-xs transition-opacity duration-500 ${i <= loadingStep ? "opacity-100" : "opacity-20"}`}>
              {i < loadingStep ? <span className="text-green-500 w-4">✓</span>
                : i === loadingStep ? <span className="w-4 flex items-center"><span className="inline-block w-3 h-3 border border-green-600 border-t-green-400 rounded-full animate-spin" /></span>
                : <span className="text-green-900 w-4">○</span>}
              <span className={i === loadingStep ? "text-green-400" : i < loadingStep ? "text-green-700" : "text-green-900"}>{step}</span>
            </div>
          ))}
          <AnalysisSkeleton />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mt-10 w-full max-w-2xl border border-red-500/40 bg-red-500/5 px-5 py-4 space-y-2">
          <span className="font-mono text-sm text-red-400"><span className="text-red-600">ERROR:</span> {error}</span>
          {errorCode === 429 && (
            <p className="font-mono text-xs text-red-700">
              Rate limit or monthly quota reached.{" "}
              <Link href="/billing" className="underline hover:text-red-500">Upgrade your plan →</Link>
            </p>
          )}
          {errorCode === 401 && (
            <p className="font-mono text-xs text-red-700">
              <Link href="/auth/signin" className="underline hover:text-red-500">Sign in to continue →</Link>
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="w-full max-w-2xl mt-10 space-y-4 animate-fadeIn">
          <ErrorBoundary section="profile"><ProfileCard profile={data.profile} /></ErrorBoundary>
          <ErrorBoundary section="persona"><PersonaBadge persona={data.persona} /></ErrorBoundary>
          <ErrorBoundary section="story"><StorySection story={data.story} username={data.profile.login} /></ErrorBoundary>
          {cardData && <ErrorBoundary section="card"><ProfileCardPreview data={cardData} /></ErrorBoundary>}
          <ErrorBoundary section="resume"><ResumeSection points={resumePoints} username={data.profile.login} onRegenerate={handleRegenerate} /></ErrorBoundary>
          <ErrorBoundary section="growth"><GrowthTracker diff={data.growth?.diff ?? null} history={data.growth?.history ?? []} insight={data.growth?.insight ?? "No growth data available."} /></ErrorBoundary>
          <ErrorBoundary section="languages"><LanguageChart languages={data.languages} skills={data.skills} /></ErrorBoundary>
          <ErrorBoundary section="analysis"><StrengthWeakness analysis={data.analysis} /></ErrorBoundary>
          <ErrorBoundary section="heatmap"><ContributionHeatmap data={data.consistency} /></ErrorBoundary>
          {data.repos.length > 0 && (
            <div>
              <div className="font-mono text-xs text-green-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>top_repositories</span><span className="text-green-900">[ ranked by quality score ]</span>
              </div>
              <div className="space-y-2">
                {data.repos.map((repo, i) => (
                  <ErrorBoundary key={repo.name} section={`repo:${repo.name}`}>
                    <RepoCard repo={repo} rank={i} />
                  </ErrorBoundary>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
