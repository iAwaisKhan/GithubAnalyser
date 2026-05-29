"use client";

interface Persona {
  type: string;
  emoji: string;
  description: string;
  traits: string[];
  insight: string;
}

interface Props {
  persona: Persona;
}

const PERSONA_ACCENT: Record<string, string> = {
  "The Builder":    "border-green-500/40 text-green-400",
  "The Researcher": "border-blue-500/40 text-blue-400",
  "The Debugger":   "border-yellow-500/40 text-yellow-400",
  "The Hacker":     "border-orange-500/40 text-orange-400",
  "The Architect":  "border-purple-500/40 text-purple-400",
  "The Explorer":   "border-cyan-500/40 text-cyan-400",
};

const PERSONA_BG: Record<string, string> = {
  "The Builder":    "bg-green-500/5",
  "The Researcher": "bg-blue-500/5",
  "The Debugger":   "bg-yellow-500/5",
  "The Hacker":     "bg-orange-500/5",
  "The Architect":  "bg-purple-500/5",
  "The Explorer":   "bg-cyan-500/5",
};

export default function PersonaBadge({ persona }: Props) {
  const accent = PERSONA_ACCENT[persona.type] ?? "border-green-500/40 text-green-400";
  const bg = PERSONA_BG[persona.type] ?? "bg-green-500/5";

  return (
    <div className={`border ${accent} ${bg}`}>
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <span className="font-mono text-xs text-green-800 uppercase tracking-widest">
          developer_dna
        </span>
        <span className="font-mono text-xs opacity-40">🧬 persona mode</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Persona type */}
        <div className="flex items-center gap-4">
          <span className="text-3xl">{persona.emoji}</span>
          <div>
            <div className={`font-mono text-xl font-bold ${accent.split(" ")[1]}`}>
              {persona.type}
            </div>
            <div className="font-mono text-xs text-green-700 mt-0.5">
              {persona.description}
            </div>
          </div>
        </div>

        {/* AI insight */}
        <div className="border-l-2 border-white/10 pl-3">
          <div className="font-mono text-[10px] text-green-900 uppercase tracking-widest mb-1">
            ai_insight
          </div>
          <p className={`font-mono text-xs leading-relaxed ${accent.split(" ")[1]} opacity-80`}>
            {persona.insight}
          </p>
        </div>

        {/* Traits */}
        <div className="flex flex-wrap gap-2">
          {persona.traits.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] border border-white/10 text-green-800 px-2 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
