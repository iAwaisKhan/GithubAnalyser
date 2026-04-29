"use client";

interface Analysis {
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

interface Props {
  analysis: Analysis;
}

export default function StrengthWeakness({ analysis }: Props) {
  const hasStrengths = analysis.strengths.length > 0;
  const hasWeaknesses = analysis.weaknesses.length > 0;
  const hasSummary =
    analysis.summary &&
    analysis.summary !== "Analysis unavailable at the moment.";

  return (
    <div className="border border-green-500/30 bg-black/60">
      {/* Header */}
      <div className="px-5 py-3 border-b border-green-500/20">
        <span className="font-mono text-xs text-green-800 uppercase tracking-widest">
          ai_analysis
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* AI Summary */}
        {hasSummary && (
          <div className="border border-green-500/20 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] text-green-600 uppercase tracking-widest">
                🧠 developer_summary
              </span>
            </div>
            <p className="font-mono text-xs text-green-400/90 leading-relaxed">
              {analysis.summary}
            </p>
          </div>
        )}

        {/* Two-column: strengths + weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Strengths */}
          <div>
            <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="text-green-500">✅</span> strengths
            </div>
            {hasStrengths ? (
              <ul className="space-y-1.5">
                {analysis.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 font-mono text-xs text-green-400"
                  >
                    <span className="text-green-600 mt-0.5 shrink-0">›</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-xs text-green-900">
                No strengths detected
              </p>
            )}
          </div>

          {/* Weaknesses */}
          <div>
            <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="text-yellow-600">⚠️</span> areas_to_improve
            </div>
            {hasWeaknesses ? (
              <ul className="space-y-1.5">
                {analysis.weaknesses.map((w, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 font-mono text-xs text-yellow-500/80"
                  >
                    <span className="text-yellow-700 mt-0.5 shrink-0">›</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-xs text-green-900">
                No weaknesses detected
              </p>
            )}
          </div>
        </div>

        {/* Fallback if no data at all */}
        {!hasStrengths && !hasWeaknesses && !hasSummary && (
          <p className="font-mono text-sm text-green-800 text-center py-2">
            Analysis unavailable at the moment
          </p>
        )}
      </div>
    </div>
  );
}
