/**
 * lib/radar.ts — Tech stack radar visualization data (2.5).
 * Categorizes languages + skills into domains (frontend, backend, systems, data, mobile, infra)
 * and returns a radar chart dataset with proficiency scores.
 */

export interface RadarAxis {
  axis: string;
  score: number; // 0-100
}

export type TechDomain =
  | "frontend"
  | "backend"
  | "systems"
  | "data"
  | "mobile"
  | "infrastructure"
  | "devops";

interface DomainMapping {
  langs: string[];
  skills: string[];
}

const DOMAIN_MAP: Record<TechDomain, DomainMapping> = {
  frontend: {
    langs: ["JavaScript", "TypeScript", "HTML", "CSS", "Vue", "React", "Svelte"],
    skills: ["React", "Vue", "Angular", "CSS", "UI/UX", "Responsive design"],
  },
  backend: {
    langs: ["Python", "Go", "Ruby", "Java", "Elixir", "PHP", "C#"],
    skills: ["REST APIs", "GraphQL", "Database design", "Authentication", "Caching"],
  },
  systems: {
    langs: ["Rust", "C", "C++", "Assembly"],
    skills: ["Concurrency", "Memory management", "Performance optimization", "Low-level"],
  },
  data: {
    langs: ["Python", "R", "Scala", "SQL", "Jupyter Notebook"],
    skills: ["Machine learning", "Data pipelines", "SQL", "Analytics", "Big data"],
  },
  mobile: {
    langs: ["Kotlin", "Swift", "Dart", "Objective-C", "Java"],
    skills: ["iOS", "Android", "Flutter", "React Native", "Cross-platform"],
  },
  infrastructure: {
    langs: ["Docker", "Terraform", "Bash", "Go", "Python"],
    skills: ["Docker", "Kubernetes", "CI/CD", "Infrastructure as Code", "Cloud"],
  },
  devops: {
    langs: ["Bash", "Python", "Go", "Terraform", "Docker"],
    skills: ["CI/CD", "Monitoring", "Logging", "Release management", "Automation"],
  },
};

export function buildTechRadar(
  languages: Record<string, number>,
  skills: string[]
): RadarAxis[] {
  const domainScores: Record<TechDomain, number> = {
    frontend: 0,
    backend: 0,
    systems: 0,
    data: 0,
    mobile: 0,
    infrastructure: 0,
    devops: 0,
  };

  // Score by language presence + percentage
  for (const [domain, mapping] of Object.entries(DOMAIN_MAP)) {
    const matchedLangs = mapping.langs.filter((l) => l in languages);
    const langScore = matchedLangs.reduce((sum, l) => sum + (languages[l] ?? 0), 0);

    const matchedSkills = mapping.skills.filter((s) => skills.includes(s));
    const skillBonus = matchedSkills.length * 15; // 15 pts per matched skill

    domainScores[domain as TechDomain] = Math.min(100, langScore + skillBonus);
  }

  // Return as sorted radar axes
  return (Object.entries(domainScores) as Array<[TechDomain, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, score]) => ({
      axis: domain.charAt(0).toUpperCase() + domain.slice(1),
      score: Math.max(0, Math.min(100, score)),
    }));
}

/**
 * Infer strongest tech domain based on radar scores.
 * Returns domain name + proficiency descriptor.
 */
export function inferDomain(radar: RadarAxis[]): { domain: string; proficiency: string } {
  if (radar.length === 0) return { domain: "Generalist", proficiency: "Emerging" };

  const top = radar[0];
  const proficiency =
    top.score >= 80
      ? "Expert"
      : top.score >= 60
        ? "Proficient"
        : top.score >= 40
          ? "Competent"
          : "Learning";

  return { domain: top.axis, proficiency };
}
