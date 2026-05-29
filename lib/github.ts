/**
 * lib/github.ts — Shared GitHub API helpers.
 * Single source of truth for auth headers, API version, and fetch wrappers.
 * Import from here instead of duplicating in route files.
 */

export const GH_API_VERSION = "2022-11-28";

export function buildGhHeaders(token?: string | null): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GH_API_VERSION,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Default server-side headers (uses GITHUB_TOKEN env var) */
export const ghHeaders = buildGhHeaders(process.env.GITHUB_TOKEN);

export interface GithubProfile {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

export async function fetchProfile(
  username: string,
  headers: HeadersInit = ghHeaders
): Promise<{ ok: boolean; status: number; data: GithubProfile | null }> {
  const res = await fetch(`https://api.github.com/users/${username}`, { headers });
  if (!res.ok) return { ok: false, status: res.status, data: null };
  return { ok: true, status: 200, data: await res.json() };
}

export async function fetchRepos(
  username: string,
  headers: HeadersInit = ghHeaders
): Promise<unknown[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`,
    { headers }
  );
  return res.ok ? res.json() : [];
}

export async function fetchEvents(
  username: string,
  headers: HeadersInit = ghHeaders
): Promise<unknown[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      fetch(
        `https://api.github.com/users/${username}/events?per_page=100&page=${page}`,
        { headers }
      ).then((r) => (r.ok ? r.json() : []))
    )
  );
  return pages.flat();
}

export async function fetchReadme(
  username: string,
  repoName: string,
  headers: HeadersInit = ghHeaders
): Promise<{ exists: boolean; excerpt: string | null }> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${username}/${repoName}/readme`,
      { headers }
    );
    if (!res.ok) return { exists: false, excerpt: null };
    const data = await res.json();
    const raw = Buffer.from(data.content ?? "", "base64").toString("utf-8");
    const excerpt =
      raw
        .replace(/[#*`>[\]!]/g, "")
        .replace(/\n+/g, " ")
        .trim()
        .slice(0, 300) || null;
    return { exists: true, excerpt };
  } catch {
    return { exists: false, excerpt: null };
  }
}

export async function fetchOrgMembers(
  org: string,
  headers: HeadersInit = ghHeaders
): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/orgs/${org}/members?per_page=100`,
      { headers }
    );
    if (!res.ok) return [];
    const data: { login: string }[] = await res.json();
    return data.map((m) => m.login);
  } catch {
    return [];
  }
}
