export interface Persona {
  type: string;
  emoji: string;
  description: string;
  traits: string[];
}

export interface PersonaInput {
  publicRepos: number;
  totalForks: number;       // sum of forks across all repos
  totalStars: number;       // sum of stars across all repos
  languageCount: number;    // distinct languages used
  commitFrequency: number;  // avg commits per active day
  consistencyScore: number;
  avgRepoScore: number;
  totalCommits: number;
}

const PERSONAS: Record<
  string,
  Omit<Persona, "type">
> = {
  "The Builder": {
    emoji: "🔨",
    description: "Creates production-ready systems with high polish and community traction.",
    traits: ["high repo count", "high stars", "strong documentation"],
  },
  "The Researcher": {
    emoji: "🔬",
    description: "Explores ideas through experimentation, forks, and diverse codebases.",
    traits: ["many forks", "language diversity", "experimental projects"],
  },
  "The Debugger": {
    emoji: "🐛",
    description: "Detail-oriented engineer who ships incrementally with precision and consistency.",
    traits: ["high commit frequency", "consistent activity", "small focused commits"],
  },
  "The Hacker": {
    emoji: "⚡",
    description: "Rapid, fearless coder who ships across many domains with raw velocity.",
    traits: ["diverse languages", "fast iteration", "high commit volume"],
  },
  "The Architect": {
    emoji: "🏗️",
    description: "Designs well-structured systems with strong quality signals and long-term thinking.",
    traits: ["high quality scores", "good documentation", "consistent patterns"],
  },
  "The Explorer": {
    emoji: "🧭",
    description: "Curious developer discovering new technologies and building across frontiers.",
    traits: ["varied languages", "moderate activity", "diverse interests"],
  },
};

export function detectPersona(input: PersonaInput): Persona {
  const scores: Record<string, number> = {
    "The Builder": 0,
    "The Researcher": 0,
    "The Debugger": 0,
    "The Hacker": 0,
    "The Architect": 0,
    "The Explorer": 0,
  };

  // The Builder: many repos, high stars, good scores
  if (input.publicRepos > 20) scores["The Builder"] += 30;
  if (input.publicRepos > 10) scores["The Builder"] += 15;
  if (input.totalStars > 50)  scores["The Builder"] += 25;
  if (input.totalStars > 10)  scores["The Builder"] += 10;
  if (input.avgRepoScore > 65) scores["The Builder"] += 20;

  // The Researcher: high forks, language diversity
  if (input.totalForks > 30)     scores["The Researcher"] += 30;
  if (input.totalForks > 10)     scores["The Researcher"] += 15;
  if (input.languageCount >= 5)  scores["The Researcher"] += 25;
  if (input.languageCount >= 3)  scores["The Researcher"] += 10;

  // The Debugger: consistent, frequent small commits
  if (input.consistencyScore > 60)  scores["The Debugger"] += 30;
  if (input.commitFrequency > 3)    scores["The Debugger"] += 25;
  if (input.consistencyScore > 40)  scores["The Debugger"] += 15;

  // The Hacker: diverse languages, high volume, rapid
  if (input.languageCount >= 4)   scores["The Hacker"] += 20;
  if (input.totalCommits > 200)   scores["The Hacker"] += 30;
  if (input.totalCommits > 80)    scores["The Hacker"] += 15;
  if (input.commitFrequency > 5)  scores["The Hacker"] += 20;

  // The Architect: high quality, good docs implied by score
  if (input.avgRepoScore > 75)    scores["The Architect"] += 35;
  if (input.avgRepoScore > 55)    scores["The Architect"] += 15;
  if (input.consistencyScore > 50) scores["The Architect"] += 20;
  if (input.publicRepos >= 5 && input.publicRepos <= 20) scores["The Architect"] += 10;

  // The Explorer: fallback / moderate across the board
  scores["The Explorer"] += 20; // base score so it never wins on a tie with nothing
  if (input.languageCount >= 2 && input.languageCount <= 4) scores["The Explorer"] += 15;
  if (input.publicRepos > 3 && input.publicRepos <= 12)     scores["The Explorer"] += 10;

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return { type: winner, ...PERSONAS[winner] };
}
