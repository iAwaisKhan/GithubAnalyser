export interface GraphQLContributionDay {
  date: string;
  contributionCount: number;
}

export interface GraphQLContributionWeek {
  contributionDays: GraphQLContributionDay[];
}

export interface GraphQLContributionCalendar {
  totalContributions: number;
  weeks: GraphQLContributionWeek[];
}

export interface GraphQLContributionsCollection {
  contributionCalendar: GraphQLContributionCalendar;
  totalCommitContributions: number;
  totalPullRequestContributions: number;
  totalIssueContributions: number;
  totalRepositoryContributions: number;
}

const CONTRIBUTIONS_QUERY = `
  query GetContributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalRepositoryContributions
      }
      repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          name
          primaryLanguage { name }
          stargazerCount
          forkCount
          description
          pushedAt
          repositoryTopics(first: 10) {
            nodes { topic { name } }
          }
        }
      }
    }
  }
`;

export interface GraphQLProfile {
  contributions: GraphQLContributionsCollection;
  dailyMap: Record<string, number>;
  totalContributions: number;
}

/** Fetch contribution data via GraphQL — requires user OAuth token */
export async function fetchContributionsGraphQL(
  username: string,
  accessToken: string,
  fromDate?: Date
): Promise<GraphQLProfile | null> {
  const token = accessToken || process.env.GITHUB_TOKEN;
  if (!token) return null;

  const to = new Date();
  const from = fromDate ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year default

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: {
          login: username,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.errors || !data.data?.user) return null;

    const collection: GraphQLContributionsCollection =
      data.data.user.contributionsCollection;

    // Build daily map from weeks
    const dailyMap: Record<string, number> = {};
    for (const week of collection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        if (day.contributionCount > 0) {
          dailyMap[day.date] = day.contributionCount;
        }
      }
    }

    return {
      contributions: collection,
      dailyMap,
      totalContributions: collection.contributionCalendar.totalContributions,
    };
  } catch (e) {
    console.warn("GraphQL contribution fetch failed, falling back to Events API:", e);
    return null;
  }
}

/** Build daily map from repos' pushAt (last resort fallback) */
export function buildDailyMapFromRepos(
  repos: Array<{ pushed_at: string | null }>
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const repo of repos) {
    if (!repo.pushed_at) continue;
    const date = repo.pushed_at.slice(0, 10);
    map[date] = (map[date] ?? 0) + 1;
  }
  return map;
}
