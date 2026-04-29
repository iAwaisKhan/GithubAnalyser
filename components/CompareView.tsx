"use client";

import { useState } from "react";
import Image from "next/image";

interface UserProfile {
  username: string; avatar_url: string; name: string | null;
  public_repos: number; total_stars: number; followers: number;
  top_languages: string[]; consistency_score: number;
  avg_repo_score: number; current_streak: number;
  longest_streak: number; total_commits: number;
  persona: string; persona_emoji: string;
}

interface MetricRow {
  metric: string; unit: string;
  user1: number; user2: number;
  winner: "user1" | "user2" | "tie";
}

interface CompareResult {
  user1: UserProfile; user2: UserProfile;
  comparison: { breakdown: MetricRow[]; user1_wins: number; user2_wins: number };
  insight: string;
}

function UserHeader({ u, isWinner }: { u: UserProfile; isWinner: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-3 p-5 border ${isWinner ? "border-green-400/40 bg-green-500/5" : "border-green-500/15 bg-black/40"}`}>
      {isWinner && <div className="font-mono text-[9px] text-green-500 uppercase tracking-widest">overall winner</div>}
      <div className="relative">
        <Image src={u.avatar_url} alt={u.username} width={52} height={52}
          className={`object-cover ${isWinner ? "" : "grayscale opacity-70"}`} />
        <span className="absolute -bottom-1 -right-1 text-base">{u.persona_emoji}</span>
      </div>
      <div className="text-center">
        <div className={`font-mono text-sm font-bold ${isWinner ? "text-green-300" : "text-green-700"}`}>
          @{u.username}
        </div>
        {u.name && <div className="font-mono text-[10px] text-green-900 mt-0.5">{u.name}</div>}
        <div className={`font-mono text-[10px] mt-1 ${isWinner ? "text-green-600" : "text-green-900"}`}>
          {u.persona}
        </div>
      </div>
    </div>
  );
}

export default function CompareView({ result }: { result: CompareResult }) {
  const { user1, user2, comparison, insight } = result;
  const u1Winning = comparison.user1_wins >= comparison.user2_wins;
  const u2Winning = comparison.user2_wins > comparison.user1_wins;

  return (
    <div className="border border-green-500/30 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/20">
        <span className="font-mono text-xs text-green-800 uppercase tracking-widest">compare_results</span>
      </div>

      <div className="p-5 space-y-5">
        {/* User headers */}
        <div className="grid grid-cols-2 gap-px bg-green-500/8">
          <UserHeader u={user1} isWinner={u1Winning} />
          <UserHeader u={user2} isWinner={u2Winning} />
        </div>

        {/* Score summary */}
        <div className="grid grid-cols-3 gap-px bg-green-500/8 text-center font-mono">
          <div className="py-3 bg-black/40">
            <div className={`text-xl font-bold ${u1Winning ? "text-green-400" : "text-green-800"}`}>
              {comparison.user1_wins}
            </div>
            <div className="text-[10px] text-green-900 uppercase tracking-widest mt-0.5">wins</div>
          </div>
          <div className="py-3 bg-black/40 border-x border-green-500/10">
            <div className="text-xl font-bold text-green-900">vs</div>
            <div className="text-[10px] text-green-900 uppercase tracking-widest mt-0.5">
              {Object.keys({ ...Array(8) }).length} metrics
            </div>
          </div>
          <div className="py-3 bg-black/40">
            <div className={`text-xl font-bold ${u2Winning ? "text-green-400" : "text-green-800"}`}>
              {comparison.user2_wins}
            </div>
            <div className="text-[10px] text-green-900 uppercase tracking-widest mt-0.5">wins</div>
          </div>
        </div>

        {/* Metric breakdown */}
        <div className="space-y-1">
          {comparison.breakdown.map((row) => {
            const max = Math.max(row.user1, row.user2, 1);
            return (
              <div key={row.metric} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                {/* User1 bar */}
                <div className="flex items-center gap-2 justify-end">
                  <span className={`font-mono text-xs tabular-nums ${row.winner === "user1" ? "text-green-400 font-bold" : "text-green-800"}`}>
                    {row.user1}{row.unit}
                  </span>
                  <div className="w-20 h-1.5 bg-green-500/8 overflow-hidden flex justify-end">
                    <div
                      className={`h-full transition-all duration-700 ${row.winner === "user1" ? "bg-green-500" : "bg-green-900"}`}
                      style={{ width: `${(row.user1 / max) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Label */}
                <div className="font-mono text-[9px] text-green-900 uppercase tracking-wide text-center whitespace-nowrap px-1">
                  {row.metric}
                </div>

                {/* User2 bar */}
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-green-500/8 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${row.winner === "user2" ? "bg-green-500" : "bg-green-900"}`}
                      style={{ width: `${(row.user2 / max) * 100}%` }}
                    />
                  </div>
                  <span className={`font-mono text-xs tabular-nums ${row.winner === "user2" ? "text-green-400 font-bold" : "text-green-800"}`}>
                    {row.user2}{row.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Language comparison */}
        <div className="grid grid-cols-2 gap-px bg-green-500/8">
          {[user1, user2].map((u) => (
            <div key={u.username} className="p-3 bg-black/40">
              <div className="font-mono text-[9px] text-green-900 uppercase tracking-widest mb-2">@{u.username} stack</div>
              <div className="flex flex-wrap gap-1">
                {u.top_languages.slice(0, 4).map((l) => (
                  <span key={l} className="font-mono text-[10px] text-green-700 border border-green-500/15 px-1.5 py-0.5">{l}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* AI insight */}
        <div className="border-l-2 border-green-500/30 pl-3">
          <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mb-1">ai_verdict</div>
          <p className="font-mono text-xs text-green-500/80 leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
}
