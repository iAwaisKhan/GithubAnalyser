import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateCustomer, createCheckoutSession, PLANS, PlanName } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json() as { plan: PlanName };
  const planConfig = PLANS[plan];

  if (!planConfig || !planConfig.priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const customerId = await getOrCreateCustomer(
      session.user.id,
      session.user.email!,
      session.user.name
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const checkoutUrl = await createCheckoutSession(
      customerId,
      planConfig.priceId,
      session.user.id,
      `${appUrl}/billing?success=true`,
      `${appUrl}/billing?canceled=true`
    );

    return NextResponse.json({ url: checkoutUrl });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
