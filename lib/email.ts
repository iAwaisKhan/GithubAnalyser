/**
 * lib/email.ts — Weekly digest email composition + Resend send.
 * Generates HTML email for user's weekly GitHub stats + insights.
 */

export interface DigestInput {
  username: string;
  email: string;
  consistencyScore: number;
  currentStreak: number;
  newRepos: number;
  newStars: number;
  topLanguage: string;
  personaType: string;
  insight: string;
}

export function composeDigestHtml(input: DigestInput): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
    .header { background: #0f172a; color: #fff; padding: 30px; border-radius: 8px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; }
    .card { background: #fff; margin: 20px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; }
    .stat { display: inline-block; width: 48%; text-align: center; margin: 10px 1%; }
    .stat-value { font-size: 28px; font-weight: bold; color: #6366f1; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-btn { background: #6366f1; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your Weekly GitHub Digest</h1>
      <p>${input.username}</p>
    </div>

    <div class="card">
      <h2>${input.personaType} 🚀</h2>
      <p>${input.insight}</p>
    </div>

    <div class="card">
      <h3>This Week's Stats</h3>
      <div style="text-align: center;">
        <div class="stat">
          <div class="stat-value">${input.currentStreak}</div>
          <div class="stat-label">Day Streak</div>
        </div>
        <div class="stat">
          <div class="stat-value">${input.consistencyScore}</div>
          <div class="stat-label">Consistency</div>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <div class="stat">
          <div class="stat-value">${input.newRepos}</div>
          <div class="stat-label">New Repos</div>
        </div>
        <div class="stat">
          <div class="stat-value">${input.newStars}</div>
          <div class="stat-label">New Stars</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Top Language</h3>
      <p style="font-size: 18px; font-weight: bold; color: #6366f1;">${input.topLanguage}</p>
    </div>

    <div class="cta">
      <a href="https://github.com/${input.username}" class="cta-btn">View Full Profile</a>
    </div>

    <div class="footer">
      <p>You're receiving this because you opted in to weekly digests. <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendWeeklyDigest(input: DigestInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set; digest not sent");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@githubanalyser.dev",
        to: input.email,
        subject: `📊 Your Weekly GitHub Digest — ${input.username}`,
        html: composeDigestHtml(input),
      }),
    });

    if (!res.ok) {
      console.error("[email] Resend error:", res.status, await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Send failed:", err);
    return false;
  }
}
