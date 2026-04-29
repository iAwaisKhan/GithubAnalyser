"use client";

import { useState, useCallback } from "react";

type Tone = "formal" | "impact" | "concise";

interface Props {
  points: string[];
  username: string;
  onRegenerate: (tone: Tone) => Promise<void>;
}

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: "formal",  label: "FORMAL",  desc: "senior engineering tone" },
  { value: "impact",  label: "IMPACT",  desc: "metrics & business value" },
  { value: "concise", label: "CONCISE", desc: "one-liner maximum" },
];

function CopyIcon({ copied }: { copied: boolean }) {
  return copied ? (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.5}>
      <rect x="5" y="5" width="9" height="9" rx="1" />
      <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" />
    </svg>
  );
}

export default function ResumeSection({ points, username, onRegenerate }: Props) {
  const [tone, setTone] = useState<Tone>("formal");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const hasPoints = points.length > 0 && points[0] !== "Resume insights unavailable.";

  const copyAll = useCallback(async () => {
    const text = points.map((p) => `• ${p}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [points]);

  const copyOne = useCallback(async (idx: number) => {
    await navigator.clipboard.writeText(points[idx]);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, [points]);

  const handleRegenerate = async (newTone: Tone) => {
    setTone(newTone);
    setRegenerating(true);
    try {
      await onRegenerate(newTone);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="border border-green-500/30 bg-black/60">
      {/* Header */}
      <div className="px-5 py-3 border-b border-green-500/20 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-green-800 uppercase tracking-widest">
            ai_resume_highlights
          </span>
          {hasPoints && (
            <span className="font-mono text-[10px] text-green-900">
              [{points.length} bullet{points.length !== 1 ? "s" : ""}]
            </span>
          )}
        </div>
        {hasPoints && (
          <button
            onClick={copyAll}
            className={`flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 border transition-colors duration-150 cursor-pointer ${
              copiedAll
                ? "border-green-400/60 text-green-400 bg-green-500/10"
                : "border-green-500/30 text-green-700 hover:border-green-500/60 hover:text-green-400"
            }`}
          >
            <CopyIcon copied={copiedAll} />
            {copiedAll ? "copied!" : "copy all"}
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Tone selector */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest">
            tone_selector
          </div>
          <div className="flex gap-2 flex-wrap">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => handleRegenerate(t.value)}
                disabled={regenerating}
                className={`flex flex-col items-start px-3 py-2 border font-mono text-xs transition-all duration-150 cursor-pointer disabled:opacity-40 ${
                  tone === t.value
                    ? "border-green-400/60 text-green-300 bg-green-500/10"
                    : "border-green-500/20 text-green-700 hover:border-green-500/40 hover:text-green-500"
                }`}
              >
                <span className="font-bold tracking-wider text-[11px]">{t.label}</span>
                <span className="text-[9px] opacity-60 mt-0.5">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bullet list */}
        {regenerating ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-green-800 font-mono text-xs mt-0.5">›</span>
                <div
                  className="h-3 bg-green-500/10 animate-pulse rounded-sm"
                  style={{ width: `${60 + i * 12}%` }}
                />
              </div>
            ))}
          </div>
        ) : hasPoints ? (
          <ul className="space-y-3">
            {points.map((point, i) => (
              <li key={i} className="group flex items-start gap-3">
                <span className="text-green-600 font-mono text-xs mt-0.5 shrink-0">›</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-green-400/90 leading-relaxed">
                    {point}
                  </p>
                </div>
                <button
                  onClick={() => copyOne(i)}
                  className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer ${
                    copiedIdx === i ? "text-green-400" : "text-green-800 hover:text-green-600"
                  }`}
                  title="Copy bullet"
                >
                  <CopyIcon copied={copiedIdx === i} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-sm text-green-800 text-center py-4">
            Resume insights unavailable
          </p>
        )}

        {/* Footer hint */}
        {hasPoints && !regenerating && (
          <div className="flex items-center justify-between pt-1 border-t border-green-500/10">
            <span className="font-mono text-[10px] text-green-900">
              // generated for @{username} · hover bullet to copy individually
            </span>
            <button
              onClick={() => handleRegenerate(tone)}
              disabled={regenerating}
              className="font-mono text-[10px] text-green-800 hover:text-green-600 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={1.5}>
                <path d="M2 8a6 6 0 1010.5-4M2 8V4m0 4H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
