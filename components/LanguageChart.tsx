"use client";

import { useEffect, useState } from "react";

interface Props {
  languages: Record<string, number>;
  skills: string[];
}

const LANG_COLORS: Record<string, string> = {
  TypeScript:  "#3178c6",
  JavaScript:  "#f1e05a",
  Python:      "#3572A5",
  Rust:        "#dea584",
  Go:          "#00ADD8",
  Java:        "#b07219",
  "C++":       "#f34b7d",
  C:           "#555555",
  Ruby:        "#701516",
  Swift:       "#F05138",
  Kotlin:      "#A97BFF",
  PHP:         "#4F5D95",
  CSS:         "#563d7c",
  HTML:        "#e34c26",
  Shell:       "#89e051",
  Dart:        "#00B4AB",
  R:           "#198CE7",
  Scala:       "#c22d40",
  Haskell:     "#5e5086",
  Elixir:      "#6e4a7e",
  "Jupyter Notebook": "#DA5B0B",
};

function langColor(name: string): string {
  return LANG_COLORS[name] ?? "#4ade80";
}

export default function LanguageChart({ languages, skills }: Props) {
  const [animated, setAnimated] = useState(false);
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="border border-green-500/30 bg-black/60 p-5">
        <div className="font-mono text-sm text-green-800 text-center py-4">
          No language data available
        </div>
      </div>
    );
  }

  return (
    <div className="border border-green-500/30 bg-black/60">
      {/* Header */}
      <div className="px-5 py-3 border-b border-green-500/20 flex items-center justify-between">
        <span className="font-mono text-xs text-green-800 uppercase tracking-widest">
          language_breakdown
        </span>
        <span className="font-mono text-xs text-green-900">
          {entries.length} language{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Mosaic bar */}
        <div className="flex h-3 overflow-hidden gap-px">
          {entries.map(([lang, pct]) => (
            <div
              key={lang}
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: animated ? `${pct}%` : "0%",
                backgroundColor: langColor(lang),
                transitionDelay: `${entries.indexOf(entries.find(([l]) => l === lang)!) * 60}ms`,
              }}
              title={`${lang}: ${pct}%`}
            />
          ))}
        </div>

        {/* Bars */}
        <div className="space-y-2.5">
          {entries.map(([lang, pct], i) => (
            <div key={lang} className="space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: langColor(lang) }}
                  />
                  <span className="text-green-400">{lang}</span>
                </div>
                <span className="text-green-700 tabular-nums">{pct}%</span>
              </div>
              <div className="h-[3px] bg-green-500/8 overflow-hidden">
                <div
                  className="h-full transition-all duration-700 ease-out"
                  style={{
                    width: animated ? `${pct}%` : "0%",
                    backgroundColor: langColor(lang),
                    transitionDelay: `${i * 60 + 100}ms`,
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Inferred skills */}
        {skills.length > 0 && (
          <div>
            <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mb-2">
              inferred_skills
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="font-mono text-[11px] text-green-400 border border-green-500/25 px-2.5 py-1 bg-green-500/5"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
