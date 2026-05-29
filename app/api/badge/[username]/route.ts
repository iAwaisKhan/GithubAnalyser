import { NextRequest, NextResponse } from "next/server";
import { getCache, setCache, cacheKey } from "@/lib/redis";

const BADGE_TTL = 30 * 60; // 30 min

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSvg(params: {
  username: string;
  persona: string;
  emoji: string;
  consistencyScore: number;
  topLanguage: string;
  streak: number;
}): string {
  const { username, persona, emoji, consistencyScore, topLanguage, streak } = params;
  const safeUser = escapeXml(username);
  const safePersona = escapeXml(persona);
  const safeLang = escapeXml(topLanguage);

  // Score bar width (max 120px)
  const barWidth = Math.round((consistencyScore / 100) * 120);
  const barColor = consistencyScore >= 70 ? "#22c55e" : consistencyScore >= 40 ? "#f59e0b" : "#ef4444";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90" viewBox="0 0 320 90">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="320" height="90" rx="8" fill="url(#bg)"/>
  <rect x="0" y="0" width="4" height="90" rx="2" fill="#6366f1"/>

  <!-- Username -->
  <text x="18" y="24" font-family="monospace" font-size="13" font-weight="bold" fill="#f1f5f9">${safeUser}</text>

  <!-- Persona -->
  <text x="18" y="44" font-family="sans-serif" font-size="11" fill="#94a3b8">${emoji} ${safePersona}</text>

  <!-- Language pill -->
  <rect x="18" y="56" width="${safeLang.length * 7 + 16}" height="18" rx="9" fill="#1e40af" opacity="0.7"/>
  <text x="26" y="69" font-family="monospace" font-size="10" fill="#bfdbfe">${safeLang}</text>

  <!-- Streak -->
  <text x="220" y="44" font-family="monospace" font-size="10" fill="#94a3b8">🔥 ${streak}d streak</text>

  <!-- Consistency bar label -->
  <text x="220" y="62" font-family="sans-serif" font-size="9" fill="#64748b">consistency</text>
  <rect x="220" y="66" width="80" height="6" rx="3" fill="#334155"/>
  <rect x="220" y="66" width="${Math.min(barWidth, 80)}" height="6" rx="3" fill="${barColor}"/>
  <text x="305" y="74" font-family="monospace" font-size="9" fill="${barColor}" text-anchor="end">${consistencyScore}</text>

  <!-- Powered by -->
  <text x="302" y="85" font-family="sans-serif" font-size="8" fill="#475569" text-anchor="end">GithubAnalyser</text>
</svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  if (!username) {
    return new NextResponse("Missing username", { status: 400 });
  }

  const badgeCacheKey = cacheKey("badge", username);

  try {
    // Try badge cache first
    const cached = await getCache<string>(badgeCacheKey);
    if (cached) {
      return new NextResponse(cached, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=1800",
        },
      });
    }

    // Pull from analysis cache
    const analysisCacheKey = cacheKey("analysis", username, "formal");
    const analysis = await getCache<{
      persona?: { type?: string; emoji?: string };
      consistency?: { score?: number; current_streak?: number };
      languages?: Record<string, number>;
    }>(analysisCacheKey);

    if (!analysis) {
      // No cached analysis — return a minimal "not yet analysed" badge
      const svg = buildSvg({
        username,
        persona: "Not yet analysed",
        emoji: "🔍",
        consistencyScore: 0,
        topLanguage: "—",
        streak: 0,
      });
      return new NextResponse(svg, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
      });
    }

    const topLanguage = analysis.languages
      ? Object.keys(analysis.languages)[0] ?? "—"
      : "—";

    const svg = buildSvg({
      username,
      persona: analysis.persona?.type ?? "Developer",
      emoji: analysis.persona?.emoji ?? "💻",
      consistencyScore: analysis.consistency?.score ?? 0,
      topLanguage,
      streak: analysis.consistency?.current_streak ?? 0,
    });

    await setCache(badgeCacheKey, svg, BADGE_TTL);

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (err) {
    console.error("Badge generation error:", err);
    return new NextResponse("Error generating badge", { status: 500 });
  }
}
