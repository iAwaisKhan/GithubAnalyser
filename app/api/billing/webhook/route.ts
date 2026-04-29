import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/billing";
import { PLANS } from "@/lib/plans";
import { pool } from "@/lib/db";
import type Stripe from "stripe";

async function updateUserPlan(customerId: string, plan: string) {
  await pool.query(
    "UPDATE users SET plan = $1, updated_at = NOW() WHERE stripe_customer_id = $2",
    [plan, customerId]
  );
}

function planFromPriceId(priceId: string): string {
  for (const [planName, config] of Object.entries(PLANS)) {
    if (config.priceId === priceId) return planName;
  }
  return "free";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.customer) {
          const subscription = await getStripe().subscriptions.retrieve(
            session.subscription as string
          );
          const priceId = subscription.items.data[0]?.price?.id ?? "";
          const plan = planFromPriceId(priceId);
          await updateUserPlan(session.customer as string, plan);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id ?? "";
        const plan = sub.status === "active" ? planFromPriceId(priceId) : "free";
        await updateUserPlan(sub.customer as string, plan);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateUserPlan(sub.customer as string, "free");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn("Payment failed for customer:", invoice.customer);
        // Optionally send email notification here
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
