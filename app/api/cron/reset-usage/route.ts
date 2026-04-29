import { NextRequest, NextResponse } from "next/server";
import { resetMonthlyUsage } from "@/lib/billing";

// Called by Vercel Cron on the 1st of each month
// vercel.json: { "crons": [{ "path": "/api/cron/reset-usage", "schedule": "0 0 1 * *" }] }
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await resetMonthlyUsage();
    return NextResponse.json({
      success: true,
      message: "Monthly usage counters reset",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Usage reset failed:", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
