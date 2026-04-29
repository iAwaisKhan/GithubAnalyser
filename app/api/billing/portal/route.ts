import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPortalSession } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = await createPortalSession(
      session.user.stripeCustomerId,
      `${appUrl}/billing`
    );
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Portal error:", e);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
