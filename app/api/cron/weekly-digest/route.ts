import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { sendWeeklyDigest } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gracefully skip if env vars are missing
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: "RESEND_API_KEY not configured" });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ skipped: true, reason: "DATABASE_URL not configured" });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Fetch all users with email and github username
    const { rows: users } = await pool.query<{
      email: string;
      github_username: string;
      name: string | null;
    }>(
      `SELECT email, github_username, name
       FROM users
       WHERE email IS NOT NULL AND github_username IS NOT NULL`
    );

    for (const user of users) {
      try {
        // Get latest 2 snapshots
        const { rows: snapshots } = await pool.query(
          `SELECT * FROM user_snapshots
           WHERE username = $1
           ORDER BY created_at DESC
           LIMIT 2`,
          [user.github_username]
        );

        if (snapshots.length === 0) {
          skipped++;
          continue;
        }

        const latest = snapshots[0];
        const previous = snapshots[1] ?? null;

        const newRepos = previous
          ? Math.max(0, latest.repo_count - previous.repo_count)
          : 0;
        const newStars = previous
          ? Math.max(0, latest.total_stars - previous.total_stars)
          : 0;

        await sendWeeklyDigest({
          username: user.github_username,
          email: user.email,
          consistencyScore: latest.consistency_score ?? 0,
          currentStreak: 0,
          newRepos,
          newStars,
          topLanguage: latest.top_language ?? "Unknown",
          personaType: "Developer",
          insight: "Keep building! Check your full profile for detailed insights.",
        });

        sent++;
      } catch (err) {
        console.error(`[weekly-digest] Failed for ${user.email}:`, err);
        failed++;
      }
    }
  } catch (err) {
    console.error("[weekly-digest] Fatal error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ sent, failed, skipped, timestamp: new Date().toISOString() });
}
