"use client";

import { useState } from "react";

interface Props {
  story: string;
  username: string;
}

export default function StorySection({ story, username }: Props) {
  const [copied, setCopied] = useState(false);
  const hasStory = story && !story.startsWith("No story generated");

  const handleShare = async () => {
    const text = `My Developer Journey 🧠\n\n${story}\n\n— @${username} · via GitHub Analyzer`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Split into sentences for animated display
  const sentences = hasStory
    ? story.split(/(?<=[.!?])\s+/).filter(Boolean)
    : [];

  return (
    <div className="border border-green-500/30 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-green-800 uppercase tracking-widest">
            developer_journey
          </span>
          <span className="font-mono text-[10px] text-green-900">🧠 story mode</span>
        </div>
        {hasStory && (
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 border transition-colors cursor-pointer ${
              copied
                ? "border-green-400/60 text-green-400 bg-green-500/10"
                : "border-green-500/30 text-green-700 hover:border-green-500/50 hover:text-green-500"
            }`}
          >
            {copied ? (
              <>
                <CheckIcon />
                copied!
              </>
            ) : (
              <>
                <ShareIcon />
                share story
              </>
            )}
          </button>
        )}
      </div>

      <div className="p-5">
        {hasStory ? (
          <div className="space-y-4">
            {/* Decorative header */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-green-500/15" />
              <span className="font-mono text-[10px] text-green-900 uppercase tracking-widest">
                the story of @{username}
              </span>
              <div className="h-px flex-1 bg-green-500/15" />
            </div>

            {/* Story paragraphs */}
            <div className="space-y-3">
              {sentences.map((sentence, i) => (
                <p
                  key={i}
                  className="font-mono text-sm text-green-400/85 leading-relaxed animate-fadeIn"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  {i === 0 && (
                    <span className="text-green-500 text-lg font-bold mr-1">
                      {sentence.charAt(0)}
                    </span>
                  )}
                  {i === 0 ? sentence.slice(1) : sentence}
                </p>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-3 border-t border-green-500/10">
              <div className="h-px flex-1 bg-green-500/10" />
              <span className="font-mono text-[9px] text-green-900 uppercase tracking-[0.3em]">
                github analyzer · story mode
              </span>
              <div className="h-px flex-1 bg-green-500/10" />
            </div>
          </div>
        ) : (
          <p className="font-mono text-sm text-green-800 text-center py-6">
            No story generated — not enough data to narrate your journey yet.
          </p>
        )}
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="3" r="1.5" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="12" cy="13" r="1.5" />
      <path d="M5.5 7L10.5 4M5.5 9L10.5 12" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
