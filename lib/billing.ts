import Stripe from "stripe";
import { PLANS } from "./plans";
import type { PlanName } from "./plans";

export { PLANS };
export type { PlanName };

// Lazy Stripe initialization — only create when the key is available
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

export { getStripe };

/** Create or retrieve Stripe customer for a user */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const { pool } = await import("./db");
  const res = await pool.query(
    "SELECT stripe_customer_id FROM users WHERE id = $1",
    [userId]
  );
  const existing = res.rows[0]?.stripe_customer_id;
  if (existing) return existing;

  const customer = await getStripe().customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });

  await pool.query(
    "UPDATE users SET stripe_customer_id = $1 WHERE id = $2",
    [customer.id, userId]
  );

  return customer.id;
}

/** Create Stripe checkout session */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { userId },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });
  return session.url!;
}

/** Create Stripe billing portal session */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

/** Increment usage count for a user */
export async function incrementUsage(userId: string): Promise<number> {
  const { pool } = await import("./db");
  const res = await pool.query(
    "UPDATE users SET analyses_used = analyses_used + 1, updated_at = NOW() WHERE id = $1 RETURNING analyses_used",
    [userId]
  );
  return res.rows[0]?.analyses_used ?? 0;
}

/** Reset monthly usage — called by cron on 1st of month */
export async function resetMonthlyUsage(): Promise<void> {
  const { pool } = await import("./db");
  await pool.query("UPDATE users SET analyses_used = 0, updated_at = NOW()");
}
