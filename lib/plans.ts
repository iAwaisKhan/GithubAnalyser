// Client-safe plan configuration — no server imports
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null as string | null,
    analyses: 5,
    features: [
      "5 analyses per month",
      "Repo scoring & AI reviews",
      "Contribution heatmap",
      "Language breakdown",
    ],
  },
  pro: {
    name: "Pro",
    price: 9,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    analyses: 100,
    features: [
      "100 analyses per month",
      "All Free features",
      "AI Resume builder (3 tones)",
      "Developer persona cards",
      "Growth tracker history",
      "Compare mode",
      "Story mode",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 49,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    analyses: 9999,
    features: [
      "Unlimited analyses",
      "All Pro features",
      "API access",
      "Team accounts",
      "Custom branding",
      "SLA + dedicated support",
    ],
  },
} as const;

export type PlanName = keyof typeof PLANS;

/** Per-plan monthly analysis limits */
export const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  pro: 100,
  enterprise: 9999,
};
