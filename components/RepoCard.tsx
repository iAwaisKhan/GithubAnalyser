"use client";

interface Repo {
  name: string;
  score: number;
  stars: number;
  forks: number;
  language: string | null;
  description: string | null;
  html_url: string;
  pushed_at: string | null;
  has_readme: boolean;
  has_description: boolean;
  ai_review: string;
}

interface Props {
  repo: Repo;
  rank: number;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  PHP: "#4F5D95",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Dart: "#00B4AB",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400 border-green-500/60";
  if (score >= 50) return "text-yellow-400 border-yellow-500/60";
  return "text-red-400 border-red-500/60";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 50) return "bg-yellow-500/10";
  return "bg-red-500/10";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MED";
  return "LOW";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "unknown";
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function RepoCard({ repo, rank }: Props) {
  const colorClass = scoreColor(repo.score);
  const bgClass = scoreBg(repo.score);
  const label = scoreLabel(repo.score);

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block border border-green-500/20 hover:border-green-500/50 transition-all duration-200 ${bgClass} group`}
      style={{ animationDelay: `${rank * 80}ms` }}
    >
      <div className="p-5">
        {/* Top row: rank + name + score badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="font-mono text-xs text-green-800 tabular-nums shrink-0">
              #{String(rank + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-sm font-bold text-green-300 group-hover:text-green-100 transition-colors truncate">
              {repo.name}
            </span>
          </div>

          {/* Score badge */}
          <div className={`shrink-0 border px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${colorClass} flex items-center gap-1.5`}>
            <span className={`text-[10px] opacity-70`}>{label}</span>
            <span className="text-base leading-none">{repo.score}</span>
            <span className="text-[10px] opacity-50">/100</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3 h-px bg-green-500/10 relative overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-700 ${
              repo.score >= 80 ? "bg-green-500" : repo.score >= 50 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${repo.score}%` }}
          />
        </div>

        {/* Description */}
        {repo.description && (
          <p className="font-mono text-xs text-green-700 mt-3 line-clamp-1">
            {repo.description}
          </p>
        )}

        {/* AI review */}
        <div className="mt-3 border-l-2 border-green-500/30 pl-3">
          <div className="font-mono text-[10px] text-green-800 uppercase tracking-widest mb-1">
            ai_review
          </div>
          <p className="font-mono text-xs text-green-500/80 leading-relaxed">
            {repo.ai_review}
          </p>
        </div>

        {/* Bottom meta row */}
        <div className="flex items-center gap-4 mt-4 font-mono text-xs text-green-800 flex-wrap">
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: LANG_COLORS[repo.language] ?? "#888" }}
              />
              {repo.language}
            </span>
          )}
          <span>★ {repo.stars.toLocaleString()}</span>
          <span>⑂ {repo.forks.toLocaleString()}</span>
          <span className="ml-auto">
            {repo.has_readme ? (
              <span className="text-green-700">README ✓</span>
            ) : (
              <span className="text-red-900">no README</span>
            )}
          </span>
          <span className="text-green-900">pushed {timeAgo(repo.pushed_at)}</span>
        </div>
      </div>
    </a>
  );
}
