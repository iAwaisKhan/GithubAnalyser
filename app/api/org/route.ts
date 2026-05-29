import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getCache, setCache, cacheKey, CACHE_TTL } from "@/lib/redis";
import { fetchOrgMembers } from "@/lib/github";

const OrgQuerySchema = z.object({
  org: z
    .string()
    .min(1, "Org name required")
    .max(39, "GitHub org names max 39 chars")
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, "Invalid org name format"),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ── Auth: require enterprise tier ──────────────────────────────────────────
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    console.warn("Auth check failed:", e);
  }

  const plan = (session?.user?.plan ?? "anonymous") as string;
  if (plan !== "enterprise") {
    return NextResponse.json(
      { error: "Org analyser is an enterprise-only feature" },
      { status: 403 }
    );
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const parsed = OrgQuerySchema.safeParse({ org: searchParams.get("org")?.trim() });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { org } = parsed.data;

  // ── Cache check ───────────────────────────────────────────────────────────
  const ck = cacheKey("org", org);
  const cached = await getCache<object>(ck);
  if (cached) return NextResponse.json({ ...cached, _cached: true });

  try {
    // ── Fetch org members ─────────────────────────────────────────────────────
    const members = await fetchOrgMembers(org);
    if (members.length === 0) {
      return NextResponse.json(
        { error: "Organization not found or has no public members" },
        { status: 404 }
      );
    }

    // ── Build summary (more members = larger team) ───────────────────────────
    const result = {
      org,
      members_count: members.length,
      members,
      analysis: {
        team_size: members.length <= 5 ? "Small" : members.length <= 20 ? "Medium" : "Large",
        estimated_capacity:
          members.length <= 5
            ? "Boutique"
            : members.length <= 20
              ? "Growing"
              : "Established",
      },
      timestamp: new Date().toISOString(),
    };

    // ── Cache for 24h ─────────────────────────────────────────────────────────
    await setCache(ck, result, CACHE_TTL.analysis);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Org analyser error:", error);
    return NextResponse.json(
      { error: "Failed to analyse organization" },
      { status: 500 }
    );
  }
}
