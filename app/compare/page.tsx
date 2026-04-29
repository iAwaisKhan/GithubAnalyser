"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import CompareView from "@/components/CompareView";
import Link from "next/link";

interface CompareResult {
  user1: {
    username: string; avatar_url: string; name: string | null;
    public_repos: number; total_stars: number; followers: number;
    top_languages: string[]; consistency_score: number; avg_repo_score: number;
    current_streak: number; longest_streak: number; total_commits: number;
    persona: string; persona_emoji: string;
  };
  user2: {
    username: string; avatar_url: string; name: string | null;
    public_repos: number; total_stars: number; followers: number;
    top_languages: string[]; consistency_score: number; avg_repo_score: number;
    current_streak: number; longest_streak: number; total_commits: number;
    persona: string; persona_emoji: string;
  };
  comparison: {
    breakdown: Array<{ metric: string; unit: string; user1: number; user2: number; winner: "user1" | "user2" | "tie" }>;
    user1_wins: number; user2_wins: number;
  };
  insight: string;
}

interface ApiError {
  error: string;
  signin_url?: string;
  upgrade_url?: string;
  status: number;
}

export default function ComparePage() {
  const { data: session } = useSession();
  const [user1, setUser1] = useState("");
  const [user2, setUser2] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user1.trim() || !user2.trim()) return;
    setLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/compare?user1=${encodeURIComponent(user1.trim())}&user2=${encodeURIComponent(user2.trim())}`
      );
      const json = await res.json();

      if (!res.ok) {
        setApiError({ ...json, status: res.status });
        return;
      }
      setResult(json);
    } catch {
      setApiError({ error: "Network error — check your connection", status: 500 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080c08] text-green-400 flex flex-col items-center px-4 py-16">
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,0.3) 2px,rgba(0,255,0,0.3) 4px)" }}
      />

      {/* Header */}
      <div className="text-center mb-10 w-full max-w-2xl">
        <Link href="/" className="font-mono text-xs text-green-800 hover:text-green-600 transition-colors mb-4 inline-block">
          ← back to analyzer
        </Link>
        <div className="font-mono text-xs text-green-800 tracking-[0.3em] uppercase mb-3">⚔️ compare mode</div>
        <h1 className="font-mono text-3xl font-bold text-green-400 tracking-tight">
          <span className="text-green-600">&gt;</span> developer_vs
          <span className="animate-blink text-green-500">_</span>
        </h1>
        <p className="font-mono text-sm text-green-700 mt-3">
          // head-to-head github profile comparison · pro feature
        </p>

        {/* Plan gate banner */}
        {session?.user?.plan === "free" && (
          <div className="mt-4 border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
            <p className="font-mono text-xs text-yellow-500">
              Compare Mode requires{" "}
              <Link href="/billing" className="underline hover:text-yellow-300">Pro plan ($9/mo)</Link>
              {" "}— upgrade to unlock.
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleCompare} className="w-full max-w-2xl">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="border border-green-500/40 focus-within:border-green-400 transition-colors bg-black/60 flex items-center">
            <span className="pl-3 font-mono text-xs text-green-700 select-none shrink-0">user_1$</span>
            <input
              value={user1}
              onChange={(e) => setUser1(e.target.value)}
              placeholder="username"
              disabled={loading}
              className="flex-1 bg-transparent px-2 py-3 font-mono text-sm text-green-300 placeholder-green-900 outline-none disabled:opacity-50"
            />
          </div>
          <span className="font-mono text-green-700 text-xl text-center">vs</span>
          <div className="border border-green-500/40 focus-within:border-green-400 transition-colors bg-black/60 flex items-center">
            <span className="pl-3 font-mono text-xs text-green-700 select-none shrink-0">user_2$</span>
            <input
              value={user2}
              onChange={(e) => setUser2(e.target.value)}
              placeholder="username"
              disabled={loading}
              className="flex-1 bg-transparent px-2 py-3 font-mono text-sm text-green-300 placeholder-green-900 outline-none disabled:opacity-50"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !user1.trim() || !user2.trim()}
          className="w-full mt-3 py-3 bg-green-500 text-black font-mono text-sm font-bold tracking-widest uppercase hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
              comparing...
            </span>
          ) : "COMPARE"}
        </button>
      </form>

      {/* Error handling with contextual CTAs */}
      {apiError && (
        <div className="mt-8 w-full max-w-2xl border border-red-500/40 bg-red-500/5 px-5 py-4 space-y-3">
          <p className="font-mono text-sm text-red-400">
            <span className="text-red-600">ERROR:</span> {apiError.error}
          </p>
          {apiError.status === 401 && (
            <Link
              href={apiError.signin_url ?? "/auth/signin"}
              className="inline-block font-mono text-xs text-green-500 border border-green-500/40 px-4 py-2 hover:bg-green-500/10 transition-colors"
            >
              sign in to use compare mode →
            </Link>
          )}
          {apiError.status === 403 && (
            <Link
              href={apiError.upgrade_url ?? "/billing"}
              className="inline-block font-mono text-xs text-yellow-500 border border-yellow-500/40 px-4 py-2 hover:bg-yellow-500/10 transition-colors"
            >
              upgrade to Pro to unlock compare mode →
            </Link>
          )}
        </div>
      )}

      {result && (
        <div className="w-full max-w-2xl mt-8 animate-fadeIn">
          <CompareView result={result} />
        </div>
      )}
    </main>
  );
}
