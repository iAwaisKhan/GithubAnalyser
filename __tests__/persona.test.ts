import { describe, it, expect } from "vitest";
import { detectPersona } from "../lib/persona";
import type { PersonaInput } from "../lib/persona";

const baseInput: PersonaInput = {
  publicRepos: 5,
  totalForks: 5,
  totalStars: 5,
  languageCount: 2,
  commitFrequency: 1,
  consistencyScore: 30,
  avgRepoScore: 40,
  totalCommits: 20,
};

describe("detectPersona", () => {
  it("returns a valid persona type", () => {
    const persona = detectPersona(baseInput);
    const validTypes = ["The Builder", "The Researcher", "The Debugger", "The Hacker", "The Architect", "The Explorer"];
    expect(validTypes).toContain(persona.type);
  });

  it("detects The Builder for high stars + many repos", () => {
    const persona = detectPersona({
      ...baseInput,
      publicRepos: 50,
      totalStars: 500,
      avgRepoScore: 80,
    });
    expect(persona.type).toBe("The Builder");
  });

  it("detects The Researcher for high forks + language diversity", () => {
    const persona = detectPersona({
      ...baseInput,
      totalForks: 100,
      languageCount: 8,
      totalStars: 5,
      publicRepos: 5,
    });
    expect(persona.type).toBe("The Researcher");
  });

  it("detects The Hacker for high commits + language diversity", () => {
    const persona = detectPersona({
      ...baseInput,
      totalCommits: 300,
      commitFrequency: 8,
      languageCount: 6,
      totalForks: 2,
      totalStars: 2,
    });
    expect(persona.type).toBe("The Hacker");
  });

  it("detects The Architect for high quality scores + consistency", () => {
    const persona = detectPersona({
      ...baseInput,
      avgRepoScore: 90,
      consistencyScore: 75,
      publicRepos: 8,
      totalStars: 10,
    });
    expect(persona.type).toBe("The Architect");
  });

  it("includes emoji in response", () => {
    const persona = detectPersona(baseInput);
    expect(persona.emoji).toBeTruthy();
    expect(typeof persona.emoji).toBe("string");
  });

  it("includes traits array", () => {
    const persona = detectPersona(baseInput);
    expect(Array.isArray(persona.traits)).toBe(true);
    expect(persona.traits.length).toBeGreaterThan(0);
  });

  it("always returns something even for a brand new empty profile", () => {
    const persona = detectPersona({
      publicRepos: 0, totalForks: 0, totalStars: 0,
      languageCount: 0, commitFrequency: 0, consistencyScore: 0,
      avgRepoScore: 0, totalCommits: 0,
    });
    expect(persona.type).toBeTruthy();
  });
});
