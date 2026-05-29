"use client";

import { useState, useRef, useCallback } from "react";

type CardStyle = "minimal" | "hacker" | "corporate";

interface CardData {
  username: string;
  name: string | null;
  avatar_url: string;
  topLanguages: string[];
  avgRepoScore: number;
  consistencyScore: number;
  topStrength: string;
  resumeHighlight: string;
  persona: { type: string; emoji: string; insight: string };
  bio: string;
}

interface Props {
  data: CardData;
}

// ── Card renderers ────────────────────────────────────────────────────────────

function MinimalCard({ d }: { d: CardData }) {
  return (
    <div
      id="dev-card"
      style={{
        width: 480, background: "#faf9f6", fontFamily: "'Georgia', serif",
        border: "1px solid #e8e5df", padding: "36px 40px",
        boxSizing: "border-box", position: "relative", overflow: "hidden",
      }}
    >
      {/* Subtle corner mark */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60,
        background: "#1a1a1a", clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />

      {/* Header */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>
        <img
          src={d.avatar_url}
          alt={d.username}
          width={64} height={64}
          style={{ borderRadius: 2, filter: "grayscale(20%)", flexShrink: 0 }}
          crossOrigin="anonymous"
        />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.2 }}>
            {d.name || d.username}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2, fontFamily: "monospace" }}>
            @{d.username}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 8, background: "#1a1a1a", color: "#faf9f6",
            padding: "3px 10px", fontSize: 11, fontFamily: "monospace" }}>
            {d.persona.emoji} {d.persona.type}
          </div>
        </div>
      </div>

      {/* Bio */}
      {d.bio && (
        <div style={{ fontSize: 12, color: "#555", fontStyle: "italic",
          borderLeft: "2px solid #ccc", paddingLeft: 12, marginBottom: 20, lineHeight: 1.6 }}>
          {d.bio.slice(0, 120)}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderTop: "1px solid #e8e5df", borderBottom: "1px solid #e8e5df" }}>
        {[
          { label: "Repo Score", value: `${d.avgRepoScore}/100` },
          { label: "Consistency", value: `${d.consistencyScore}%` },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "12px 0", textAlign: "center",
            borderRight: i === 0 ? "1px solid #e8e5df" : "none" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace",
              textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Languages */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase",
          letterSpacing: 1, color: "#aaa", marginBottom: 8 }}>Top Languages</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {d.topLanguages.slice(0, 4).map((l) => (
            <span key={l} style={{ fontSize: 11, fontFamily: "monospace", color: "#444",
              border: "1px solid #ddd", padding: "2px 8px" }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Resume highlight */}
      <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace",
        background: "#f0ede8", padding: "10px 12px", lineHeight: 1.5 }}>
        {d.resumeHighlight.slice(0, 140)}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, fontFamily: "monospace", color: "#bbb", textTransform: "uppercase", letterSpacing: 2 }}>
          github.com/{d.username}
        </div>
        <div style={{ fontSize: 9, fontFamily: "monospace", color: "#bbb" }}>github analyzer</div>
      </div>
    </div>
  );
}

function HackerCard({ d }: { d: CardData }) {
  return (
    <div
      id="dev-card"
      style={{
        width: 480, background: "#080c08", fontFamily: "monospace",
        border: "1px solid rgba(74,222,128,0.3)", padding: "28px 32px",
        boxSizing: "border-box", position: "relative", overflow: "hidden",
      }}
    >
      {/* Scanline */}
      <div style={{ position: "absolute", inset: 0, backgroundImage:
        "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,0.015) 2px,rgba(0,255,0,0.015) 4px)",
        pointerEvents: "none" }} />

      {/* Corner accent */}
      <div style={{ position: "absolute", top: 12, right: 12,
        width: 8, height: 8, background: "#4ade80", borderRadius: "50%" }} />

      {/* Prompt line */}
      <div style={{ fontSize: 10, color: "rgba(74,222,128,0.4)", marginBottom: 20, letterSpacing: 2 }}>
        &gt; GITHUB_ANALYZER — PROFILE_OUTPUT
      </div>

      {/* Header */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 22 }}>
        <img
          src={d.avatar_url}
          alt={d.username}
          width={56} height={56}
          style={{ filter: "grayscale(100%) brightness(1.2)", border: "1px solid rgba(74,222,128,0.4)", flexShrink: 0 }}
          crossOrigin="anonymous"
        />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80", letterSpacing: -0.5 }}>
            {d.name || d.username}
          </div>
          <div style={{ fontSize: 11, color: "rgba(74,222,128,0.5)", marginTop: 1 }}>
            @{d.username}
          </div>
          <div style={{ display: "inline-flex", gap: 5, alignItems: "center",
            marginTop: 6, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)",
            padding: "2px 10px", fontSize: 10, color: "#4ade80", letterSpacing: 1 }}>
            {d.persona.emoji} {d.persona.type.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Persona insight */}
      <div style={{ fontSize: 10, color: "rgba(74,222,128,0.6)", borderLeft: "2px solid rgba(74,222,128,0.3)",
        paddingLeft: 10, marginBottom: 20, lineHeight: 1.6 }}>
        {d.persona.insight.slice(0, 140)}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
        background: "rgba(74,222,128,0.08)", marginBottom: 20 }}>
        {[
          { k: "REPO_SCORE", v: `${d.avgRepoScore}/100` },
          { k: "CONSISTENCY", v: `${d.consistencyScore}%` },
        ].map((s) => (
          <div key={s.k} style={{ padding: "10px 14px", borderBottom: "1px solid rgba(74,222,128,0.1)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>{s.v}</div>
            <div style={{ fontSize: 9, color: "rgba(74,222,128,0.4)", textTransform: "uppercase", letterSpacing: 2, marginTop: 2 }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* Languages */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "rgba(74,222,128,0.4)", textTransform: "uppercase",
          letterSpacing: 2, marginBottom: 8 }}>STACK_DETECTED</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {d.topLanguages.slice(0, 5).map((l) => (
            <span key={l} style={{ fontSize: 10, color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.25)", padding: "2px 8px",
              background: "rgba(74,222,128,0.05)" }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Resume line */}
      <div style={{ fontSize: 10, color: "rgba(74,222,128,0.5)",
        background: "rgba(0,0,0,0.4)", padding: "8px 12px", lineHeight: 1.6,
        borderLeft: "2px solid rgba(74,222,128,0.2)" }}>
        // {d.resumeHighlight.slice(0, 140)}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 9, color: "rgba(74,222,128,0.25)", letterSpacing: 2 }}>
          github.com/{d.username}
        </div>
        <div style={{ fontSize: 9, color: "rgba(74,222,128,0.25)" }}>
          github_analyzer v6
        </div>
      </div>
    </div>
  );
}

function CorporateCard({ d }: { d: CardData }) {
  return (
    <div
      id="dev-card"
      style={{
        width: 480, background: "#f8fafc", fontFamily: "'Georgia', serif",
        boxSizing: "border-box", overflow: "hidden",
        border: "1px solid #cbd5e1",
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #1e3a5f, #2563eb, #1e3a5f)" }} />

      <div style={{ padding: "28px 36px" }}>
        {/* Header */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 20,
          paddingBottom: 20, borderBottom: "1px solid #e2e8f0" }}>
          <img
            src={d.avatar_url}
            alt={d.username}
            width={60} height={60}
            style={{ borderRadius: "50%", border: "3px solid #1e3a5f", flexShrink: 0 }}
            crossOrigin="anonymous"
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
              {d.name || d.username}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginTop: 2 }}>
              @{d.username} · GitHub Developer Profile
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
              background: "#1e3a5f", color: "#e2e8f0",
              padding: "3px 10px", fontSize: 10, fontFamily: "monospace", letterSpacing: 1 }}>
              {d.persona.emoji} {d.persona.type}
            </div>
          </div>
        </div>

        {/* Bio */}
        {d.bio && (
          <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic",
            marginBottom: 18, lineHeight: 1.6 }}>
            "{d.bio.slice(0, 110)}"
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 0, marginBottom: 18, border: "1px solid #e2e8f0" }}>
          {[
            { label: "Repo Quality", value: `${d.avgRepoScore}`, unit: "/100" },
            { label: "Consistency", value: `${d.consistencyScore}`, unit: "%" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "14px 20px", textAlign: "center",
              background: i === 0 ? "#f1f5f9" : "#fff",
              borderRight: i === 0 ? "1px solid #e2e8f0" : "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: "#1e3a5f" }}>{s.value}</span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace",
                textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase",
            letterSpacing: 1, color: "#94a3b8", marginBottom: 8 }}>Core Technologies</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {d.topLanguages.slice(0, 4).map((l) => (
              <span key={l} style={{ fontSize: 11, fontFamily: "monospace",
                background: "#e2e8f0", color: "#1e3a5f", padding: "3px 10px",
                borderRadius: 2 }}>{l}</span>
            ))}
          </div>
        </div>

        {/* Highlight */}
        <div style={{ fontSize: 11, color: "#334155", background: "#f1f5f9",
          border: "1px solid #e2e8f0", borderLeft: "3px solid #2563eb",
          padding: "10px 14px", lineHeight: 1.6, fontFamily: "'Georgia', serif" }}>
          {d.resumeHighlight.slice(0, 150)}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between",
          alignItems: "center", paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#cbd5e1",
            textTransform: "uppercase", letterSpacing: 2 }}>github.com/{d.username}</div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#cbd5e1" }}>
            GitHub Analyzer · Professional Report
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const STYLES: { value: CardStyle; label: string; desc: string }[] = [
  { value: "minimal",   label: "MINIMAL",   desc: "editorial / clean" },
  { value: "hacker",    label: "HACKER",    desc: "terminal / neon" },
  { value: "corporate", label: "CORPORATE", desc: "executive / formal" },
];

export default function ProfileCardPreview({ data }: Props) {
  const [style, setStyle] = useState<CardStyle>("hacker");
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadCard = useCallback(async () => {
    const el = document.getElementById("dev-card");
    if (!el) return;
    setDownloading(true);
    try {
      // Dynamically import html-to-image
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `${data.username}-devcard-${style}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(false);
    }
  }, [data.username, style]);

  const shareCard = useCallback(async () => {
    const shareText = `Check out my GitHub developer profile — I'm "${data.persona.type}" 🧬\n${data.persona.insight}\n\ngithub.com/${data.username}`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [data]);

  return (
    <div className="border border-green-500/30 bg-black/60">
      {/* Header */}
      <div className="px-5 py-3 border-b border-green-500/20 flex items-center justify-between flex-wrap gap-3">
        <span className="font-mono text-xs text-green-800 uppercase tracking-widest">
          profile_card_generator
        </span>
        <div className="flex gap-2">
          <button
            onClick={shareCard}
            className={`flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 border transition-colors cursor-pointer ${
              copied ? "border-green-400/60 text-green-400 bg-green-500/10"
                     : "border-green-500/30 text-green-700 hover:border-green-500/50 hover:text-green-500"
            }`}
          >
            {copied ? (
              <><CheckIcon /> copied!</>
            ) : (
              <><ShareIcon /> share</>
            )}
          </button>
          <button
            onClick={downloadCard}
            disabled={downloading}
            className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 border border-green-500/50 text-green-500 hover:bg-green-500/10 transition-colors cursor-pointer disabled:opacity-40"
          >
            {downloading ? (
              <span className="inline-block w-3 h-3 border border-green-600 border-t-green-400 rounded-full animate-spin" />
            ) : (
              <DownloadIcon />
            )}
            {downloading ? "rendering..." : "download PNG"}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Style selector */}
        <div>
          <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mb-2">
            card_style
          </div>
          <div className="flex gap-2 flex-wrap">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`flex flex-col items-start px-3 py-2 border font-mono text-xs transition-all cursor-pointer ${
                  style === s.value
                    ? "border-green-400/60 text-green-300 bg-green-500/10"
                    : "border-green-500/20 text-green-700 hover:border-green-500/40"
                }`}
              >
                <span className="font-bold text-[11px] tracking-wider">{s.label}</span>
                <span className="text-[9px] opacity-60 mt-0.5">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card preview */}
        <div
          ref={cardRef}
          className="overflow-hidden flex justify-center"
          style={{ background: style === "hacker" ? "#080c08" : style === "minimal" ? "#faf9f6" : "#f8fafc" }}
        >
          <div style={{ transform: "scale(0.85)", transformOrigin: "top center", marginBottom: -60 }}>
            {style === "minimal"   && <MinimalCard   d={data} />}
            {style === "hacker"    && <HackerCard    d={data} />}
            {style === "corporate" && <CorporateCard d={data} />}
          </div>
        </div>

        <p className="font-mono text-[10px] text-green-900 text-center">
          // click "download PNG" to export a 2× resolution image
        </p>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.5}>
      <path d="M8 2v8m-3-3l3 3 3-3M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="3" r="1.5" /><circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="13" r="1.5" />
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
