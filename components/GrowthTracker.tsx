"use client";

import { useEffect, useState } from "react";

interface Snapshot {
  id: number; username: string; repo_count: number;
  total_stars: number; consistency_score: number;
  avg_repo_score: number; top_language: string | null;
  created_at: string;
}

interface GrowthDiff {
  repo_growth: number; stars_growth: number;
  consistency_change: number; score_change: number;
  snapshots_available: number;
  latest: Snapshot; previous: Snapshot | null;
}

interface Props {
  diff: GrowthDiff | null;
  history: Snapshot[];
  insight: string;
}

function Delta({ value, unit = "" }: { value: number; unit?: string }) {
  if (value === 0) return <span className="font-mono text-xs text-green-900">—</span>;
  const up = value > 0;
  return (
    <span className={`font-mono text-xs font-bold flex items-center gap-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
      <span>{up ? "↑" : "↓"}</span>
      <span>{Math.abs(value)}{unit}</span>
    </span>
  );
}

// Minimal inline SVG sparkline
function Sparkline({ data, field }: { data: Snapshot[]; field: keyof Snapshot }) {
  if (data.length < 2) return null;
  const values = data.map((s) => Number(s[field]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 120, H = 32, pad = 4;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-60">
      <polyline points={points} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((_, i) => {
        const x = pad + (i / (values.length - 1)) * (W - pad * 2);
        const y = H - pad - ((values[i] - min) / range) * (H - pad * 2);
        return <circle key={i} cx={x} cy={y} r="2" fill="#4ade80" />;
      })}
    </svg>
  );
}

export default function GrowthTracker({ diff, history, insight }: Props) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

  const noData = !diff || diff.snapshots_available < 2;

  const metrics = diff ? [
    { label: "repos",       delta: diff.repo_growth,         current: diff.latest.repo_count,         field: "repo_count" as const,       unit: "" },
    { label: "stars",       delta: diff.stars_growth,        current: diff.latest.total_stars,        field: "total_stars" as const,      unit: "★" },
    { label: "consistency", delta: diff.consistency_change,  current: diff.latest.consistency_score,  field: "consistency_score" as const, unit: "/100" },
    { label: "quality",     delta: diff.score_change,        current: diff.latest.avg_repo_score,     field: "avg_repo_score" as const,    unit: "/100" },
  ] : [];

  return (
    <div className="border border-green-500/30 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/20 flex items-center justify-between">
        <span className="font-mono text-xs text-green-800 uppercase tracking-widest">growth_tracker</span>
        {diff && (
          <span className="font-mono text-[10px] text-green-900">
            {diff.snapshots_available} scan{diff.snapshots_available !== 1 ? "s" : ""} recorded
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {noData ? (
          <div className="text-center py-6 space-y-2">
            <div className="font-mono text-2xl opacity-20">📈</div>
            <p className="font-mono text-xs text-green-800">
              {diff?.snapshots_available === 1
                ? "first scan saved — analyze again later to track growth"
                : "no growth data available — database not configured"}
            </p>
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-px bg-green-500/8">
              {metrics.map((m) => (
                <div key={m.label} className="p-4 space-y-2 bg-black/40">
                  <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest">{m.label}</div>
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-xl font-bold text-green-400 tabular-nums">
                      {m.current}{m.unit}
                    </span>
                    <Delta value={m.delta} />
                  </div>
                  <Sparkline data={[...history].reverse()} field={m.field} />
                </div>
              ))}
            </div>

            {/* AI insight */}
            <div className="border-l-2 border-green-500/30 pl-3">
              <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mb-1">ai_growth_insight</div>
              <p className="font-mono text-xs text-green-500/80 leading-relaxed">{insight}</p>
            </div>

            {/* Snapshot timeline */}
            {history.length > 1 && (
              <div>
                <div className="font-mono text-[10px] text-green-900 uppercase tracking-widest mb-2">scan_history</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...history].reverse().slice(0, 8).map((snap, i) => (
                    <div key={snap.id} className={`flex items-center justify-between font-mono text-[10px] px-3 py-1.5 ${i === 0 ? "bg-green-500/5 border-l border-green-500/30" : ""}`}>
                      <span className="text-green-900">{new Date(snap.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}</span>
                      <div className="flex gap-4 text-green-800">
                        <span>{snap.repo_count} repos</span>
                        <span>{snap.total_stars}★</span>
                        <span>{snap.consistency_score}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
