"use client";

import { useState } from "react";

interface DayEntry {
  date: string;
  count: number;
}

interface ConsistencyData {
  score: number;
  current_streak: number;
  longest_streak: number;
  active_days: number;
  total_days: number;
  total_commits: number;
  heatmap: DayEntry[];
  ai_insight: string;
}

interface Props {
  data: ConsistencyData;
}

function cellColor(count: number): string {
  if (count === 0) return "bg-green-500/8 border-green-500/10";
  if (count <= 2) return "bg-green-900/60 border-green-800/40";
  if (count <= 5) return "bg-green-700/70 border-green-600/40";
  if (count <= 9) return "bg-green-500/80 border-green-400/40";
  return "bg-green-400 border-green-300/60";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreColor(score: number) {
  if (score >= 70) return "text-green-400 border-green-500/60";
  if (score >= 40) return "text-yellow-400 border-yellow-500/60";
  return "text-red-400 border-red-500/60";
}

/** Group heatmap into weeks (columns of 7) */
function toWeeks(heatmap: DayEntry[]): DayEntry[][] {
  const weeks: DayEntry[][] = [];
  // Pad start so first day falls on correct weekday
  const firstDow = new Date(heatmap[0]?.date + "T00:00:00").getDay(); // 0=Sun
  const padded: (DayEntry | null)[] = [
    ...Array(firstDow).fill(null),
    ...heatmap,
  ];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7).filter(Boolean) as DayEntry[]);
  }
  return weeks;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function ContributionHeatmap({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ entry: DayEntry; x: number; y: number } | null>(null);

  const weeks = toWeeks(data.heatmap);
  const hasActivity = data.total_commits > 0;

  // Month labels: find first week index per month
  const monthLabels: { label: string; weekIdx: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week[0];
    if (!first) return;
    const m = new Date(first.date + "T00:00:00").getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ label: MONTHS[m], weekIdx: wi });
      lastMonth = m;
    }
  });

  return (
    <div className="border border-green-500/30 bg-black/60">
      {/* Header */}
      <div className="px-5 py-3 border-b border-green-500/20 flex items-center justify-between flex-wrap gap-2">
        <span className="font-mono text-xs text-green-800 uppercase tracking-widest">
          contribution_heatmap
        </span>
        <span className="font-mono text-xs text-green-900">
          last {data.total_days} days · {data.total_commits} commits
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-px bg-green-500/10">
          <div className={`border px-4 py-3 text-center ${scoreColor(data.score)}`}>
            <div className="font-mono text-2xl font-bold tabular-nums">{data.score}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-0.5">consistency</div>
          </div>
          <div className="border border-green-500/20 px-4 py-3 text-center">
            <div className="font-mono text-2xl font-bold text-orange-400 tabular-nums">
              {data.current_streak}
            </div>
            <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mt-0.5">
              🔥 cur streak
            </div>
          </div>
          <div className="border border-green-500/20 px-4 py-3 text-center">
            <div className="font-mono text-2xl font-bold text-yellow-400 tabular-nums">
              {data.longest_streak}
            </div>
            <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mt-0.5">
              🏆 best streak
            </div>
          </div>
        </div>

        {/* Heatmap grid */}
        {!hasActivity ? (
          <div className="font-mono text-sm text-green-800 text-center py-6">
            No recent contributions found
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            {/* Month row */}
            <div className="flex mb-1 ml-8">
              {weeks.map((_, wi) => {
                const label = monthLabels.find((m) => m.weekIdx === wi);
                return (
                  <div key={wi} className="w-[11px] shrink-0 mr-[2px]">
                    {label && (
                      <span className="font-mono text-[9px] text-green-800 whitespace-nowrap">
                        {label.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-0">
              {/* Day labels */}
              <div className="flex flex-col gap-[2px] mr-1 shrink-0">
                {DAYS.map((d, i) => (
                  <div key={d} className="h-[11px] font-mono text-[8px] text-green-900 leading-none flex items-center">
                    {i % 2 === 1 ? d.slice(0, 1) : ""}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px] mr-[2px]">
                  {week.map((entry, di) => (
                    <div
                      key={di}
                      className={`w-[11px] h-[11px] border cursor-pointer transition-opacity hover:opacity-100 ${cellColor(entry.count)}`}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({ entry, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-3 justify-end">
              <span className="font-mono text-[9px] text-green-900">less</span>
              {[0, 1, 3, 6, 10].map((v) => (
                <div key={v} className={`w-[10px] h-[10px] border ${cellColor(v)}`} />
              ))}
              <span className="font-mono text-[9px] text-green-900">more</span>
            </div>
          </div>
        )}

        {/* AI Insight */}
        {data.ai_insight && data.ai_insight !== "No activity insights available." && (
          <div className="border-l-2 border-green-500/30 pl-3">
            <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mb-1">
              ai_activity_insight
            </div>
            <p className="font-mono text-xs text-green-500/80 leading-relaxed">
              {data.ai_insight}
            </p>
          </div>
        )}

        {/* Active days note */}
        <div className="font-mono text-[10px] text-green-900 text-right">
          {data.active_days} active / {data.total_days} total days
        </div>
      </div>

      {/* Tooltip (fixed position) */}
      {tooltip && (
        <div
          className="fixed z-[100] pointer-events-none font-mono text-xs bg-black border border-green-500/60 text-green-300 px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: tooltip.x + 16, top: tooltip.y - 36 }}
        >
          {tooltip.entry.count === 0
            ? `No commits on ${formatDate(tooltip.entry.date)}`
            : `${tooltip.entry.count} commit${tooltip.entry.count > 1 ? "s" : ""} on ${formatDate(tooltip.entry.date)}`}
        </div>
      )}
    </div>
  );
}
