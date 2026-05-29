import { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getAnalysis(username: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(
      `${baseUrl}/api/github?username=${encodeURIComponent(username)}`,
      { next: { revalidate: 1800 } } // 30 min ISR
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getAnalysis(username);
  if (!data) {
    return { title: `${username} — GithubAnalyser` };
  }
  const persona = data.persona?.type ?? "Developer";
  const topLang = data.languages ? Object.keys(data.languages)[0] : "Code";
  const score = data.consistency?.score ?? 0;

  return {
    title: `${username} — ${persona} | GithubAnalyser`,
    description: `${username} is ${persona}. Top language: ${topLang}. Consistency score: ${score}/100.`,
    openGraph: {
      title: `${username} ${data.persona?.emoji ?? "💻"} ${persona}`,
      description: `Top language: ${topLang} · Consistency: ${score}/100 · ${data.consistency?.current_streak ?? 0}d streak`,
      images: [
        {
          url: data.profile?.avatar_url ?? "",
          width: 400,
          height: 400,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${username} on GithubAnalyser`,
      description: `${persona} · ${topLang} · Score ${score}/100`,
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const data = await getAnalysis(username);
  if (!data || data.error) notFound();

  const { profile, persona, consistency, languages, analysis, story, collaboration } = data;
  const topLangs = languages ? Object.entries(languages as Record<string, number>).slice(0, 5) : [];
  const badgeMarkdown = `[![GithubAnalyser](${process.env.NEXTAUTH_URL ?? ""}/api/badge/${username})](${process.env.NEXTAUTH_URL ?? ""}/u/${username})`;

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-6 max-w-3xl mx-auto">
      {/* Read-only banner */}
      <div className="border border-yellow-500/40 bg-yellow-900/10 text-yellow-400 text-xs px-4 py-2 mb-6 rounded">
        📖 Public view — shared profile for <strong>@{profile.login}</strong>
      </div>

      {/* Header */}
      <div className="border border-green-500/40 bg-black/60 p-6 flex gap-5 items-start mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatar_url}
          alt={profile.login}
          width={64}
          height={64}
          className="w-16 h-16 border-2 border-green-500/60 grayscale"
        />
        <div>
          <a
            href={profile.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold text-green-300 hover:text-green-100"
          >
            @{profile.login}
          </a>
          {profile.name && <div className="text-green-600 text-sm">{profile.name}</div>}
          {profile.bio && <div className="text-green-700 text-xs mt-1">{profile.bio}</div>}
          <div className="flex gap-4 mt-2 text-xs text-green-700">
            <span>{profile.public_repos} repos</span>
            <span>{profile.followers} followers</span>
          </div>
        </div>
      </div>

      {/* Persona */}
      <div className="border border-green-500/40 bg-black/40 p-4 mb-4">
        <div className="text-xs text-green-600 uppercase tracking-widest mb-1">Persona</div>
        <div className="text-xl">{persona.emoji} {persona.type}</div>
        {persona.insight && <p className="text-green-600 text-sm mt-2">{persona.insight}</p>}
      </div>

      {/* Consistency */}
      <div className="border border-green-500/40 bg-black/40 p-4 mb-4 grid grid-cols-3 gap-4 text-center">
        {[
          { label: "Score", value: `${consistency.score}/100` },
          { label: "Streak", value: `${consistency.current_streak}d` },
          { label: "Active Days", value: `${consistency.active_days}/90` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-green-400 font-bold text-lg">{value}</div>
            <div className="text-green-700 text-xs uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>

      {/* Languages */}
      {topLangs.length > 0 && (
        <div className="border border-green-500/40 bg-black/40 p-4 mb-4">
          <div className="text-xs text-green-600 uppercase tracking-widest mb-3">Languages</div>
          <div className="space-y-2">
            {topLangs.map(([lang, pct]) => (
              <div key={lang} className="flex items-center gap-3">
                <span className="w-28 text-sm text-green-300">{lang}</span>
                <div className="flex-1 bg-green-900/30 h-2 rounded">
                  <div
                    className="bg-green-500 h-2 rounded"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-green-600 w-8 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collaboration (PR/Issues/Topics) */}
      {collaboration && (
        <div className="border border-green-500/40 bg-black/40 p-4 mb-4">
          <div className="text-xs text-green-600 uppercase tracking-widest mb-3">Collaboration</div>
          <div className="flex gap-6 text-sm mb-3">
            <span>🔀 {collaboration.pull_requests} PRs</span>
            <span>🐛 {collaboration.issues} issues</span>
          </div>
          {collaboration.topics?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(collaboration.topics as string[]).map((t) => (
                <span key={t} className="text-xs border border-green-700/50 text-green-600 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tech Radar / Strongest Domain */}
      {data.radar && (
        <div className="border border-green-500/40 bg-black/40 p-4 mb-4">
          <div className="text-xs text-green-600 uppercase tracking-widest mb-2">Tech Stack</div>
          <div className="text-lg font-bold text-green-300 mb-2">
            {data.radar.strongestDomain} · {data.radar.proficiency}
          </div>
          <div className="space-y-1 text-xs">
            {data.radar.axes?.slice(0, 5).map((a: { axis: string; score: number }) => (
              <div key={a.axis} className="flex items-center gap-2">
                <span className="w-20 text-green-600">{a.axis}</span>
                <div className="flex-1 bg-green-900/30 h-2 rounded">
                  <div className="bg-green-500 h-2 rounded" style={{ width: `${a.score}%` }} />
                </div>
                <span className="text-green-600 w-8 text-right">{a.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {analysis?.strengths?.length > 0 && (
        <div className="border border-green-500/40 bg-black/40 p-4 mb-4">
          <div className="text-xs text-green-600 uppercase tracking-widest mb-2">Strengths</div>
          <ul className="space-y-1 text-sm text-green-300">
            {(analysis.strengths as string[]).map((s) => (
              <li key={s}>✓ {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Story */}
      {story && (
        <div className="border border-green-500/40 bg-black/40 p-4 mb-4">
          <div className="text-xs text-green-600 uppercase tracking-widest mb-2">Developer Story</div>
          <p className="text-sm text-green-300 leading-relaxed">{story}</p>
        </div>
      )}

      {/* Badge embed */}
      <div className="border border-green-500/20 bg-black/20 p-4 mb-4">
        <div className="text-xs text-green-700 uppercase tracking-widest mb-2">Add badge to your README</div>
        <pre className="text-xs text-green-600 bg-black/50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
          {badgeMarkdown}
        </pre>
      </div>

      {/* CTA */}
      <div className="text-center py-4">
        <a
          href="/"
          className="border border-green-500/60 text-green-400 px-6 py-2 text-sm hover:bg-green-900/20 transition-colors"
        >
          Analyse your GitHub →
        </a>
      </div>
    </div>
  );
}
