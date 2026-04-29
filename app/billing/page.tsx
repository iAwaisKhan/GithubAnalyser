"use client";

import { useSession } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PLANS } from "@/lib/plans";
import Link from "next/link";

type PlanKey = "free" | "pro" | "enterprise";

const PLAN_ORDER: PlanKey[] = ["free", "pro", "enterprise"];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0" stroke="currentColor" strokeWidth={2}>
      <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BillingContent() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const success = params.get("success") === "true";
  const canceled = params.get("canceled") === "true";
  const [loading, setLoading] = useState<PlanKey | null>(null);

  const currentPlan = (session?.user?.plan ?? "free") as PlanKey;

  const handleUpgrade = async (plan: PlanKey) => {
    if (plan === "free") return;
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setLoading("pro");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    finally { setLoading(null); }
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,0.3) 2px,rgba(0,255,0,0.3) 4px)" }}
      />

      <div className="text-center mb-12">
        <Link href="/" className="font-mono text-xs text-green-800 hover:text-green-600 transition-colors mb-4 inline-block">← back</Link>
        <div className="font-mono text-xs text-green-800 tracking-[0.3em] uppercase mb-3">pricing</div>
        <h1 className="font-mono text-3xl font-bold text-green-400">
          <span className="text-green-600">&gt;</span> choose_plan
        </h1>
        <p className="font-mono text-sm text-green-700 mt-2">// unlock full developer intelligence</p>
      </div>

      {/* Status banners */}
      {success && (
        <div className="w-full max-w-3xl mb-8 border border-green-400/40 bg-green-500/10 px-5 py-4 font-mono text-sm text-green-400">
          ✓ Subscription activated — your plan has been upgraded!
        </div>
      )}
      {canceled && (
        <div className="w-full max-w-3xl mb-8 border border-yellow-500/40 bg-yellow-500/5 px-5 py-4 font-mono text-sm text-yellow-400">
          Checkout canceled — no charge was made.
        </div>
      )}

      {/* Current usage */}
      {session && (
        <div className="w-full max-w-3xl mb-8 border border-green-500/20 bg-black/60 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="font-mono text-xs text-green-700">
            current plan: <span className="text-green-400 font-bold uppercase">{currentPlan}</span>
            <span className="text-green-900 ml-3">·</span>
            <span className="text-green-900 ml-3">{session.user.analysesUsed} / {session.user.analysesLimit} analyses used this month</span>
          </div>
          {session.user.stripeCustomerId && (
            <button onClick={handleManage}
              className="font-mono text-xs text-green-700 border border-green-500/20 px-3 py-1.5 hover:border-green-500/40 hover:text-green-500 transition-colors cursor-pointer">
              manage billing →
            </button>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-px bg-green-500/10">
        {PLAN_ORDER.map((planKey) => {
          const plan = PLANS[planKey];
          const isCurrent = currentPlan === planKey;
          const isPopular = planKey === "pro";

          return (
            <div
              key={planKey}
              className={`flex flex-col bg-[#080c08] p-6 space-y-5 ${isPopular ? "border border-green-400/40" : "border border-transparent"}`}
            >
              {isPopular && (
                <div className="font-mono text-[9px] text-green-500 uppercase tracking-[0.3em] text-center -mt-3 -mx-6 bg-green-500/10 py-1.5 border-b border-green-400/20">
                  most popular
                </div>
              )}

              {/* Plan name + price */}
              <div>
                <div className="font-mono text-xs text-green-800 uppercase tracking-widest mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold text-green-400">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="font-mono text-xs text-green-800">/month</span>}
                </div>
                <div className="font-mono text-xs text-green-800 mt-1">
                  {plan.analyses >= 9999 ? "unlimited" : `${plan.analyses}`} analyses/month
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-mono text-xs text-green-700">
                    <span className="text-green-600 mt-0.5"><CheckIcon /></span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => isCurrent ? null : handleUpgrade(planKey)}
                disabled={isCurrent || !!loading || planKey === "free"}
                className={`w-full py-3 font-mono text-sm font-bold uppercase tracking-widest transition-colors cursor-pointer disabled:cursor-default
                  ${isCurrent
                    ? "bg-green-500/10 text-green-700 border border-green-500/20"
                    : planKey === "free"
                      ? "bg-transparent text-green-900 border border-green-500/10"
                      : "bg-green-500 text-black hover:bg-green-400 disabled:opacity-50"
                  }`}
              >
                {loading === planKey ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    redirecting...
                  </span>
                ) : isCurrent ? "current plan" : planKey === "free" ? "downgrade" : `upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="w-full max-w-3xl mt-12 border border-green-500/20 bg-black/60">
        <div className="px-5 py-3 border-b border-green-500/20">
          <span className="font-mono text-xs text-green-800 uppercase tracking-widest">faq</span>
        </div>
        <div className="divide-y divide-green-500/10">
          {[
            ["What counts as an analysis?", "Each time you submit a GitHub username for full analysis. Regenerating resume bullets or refreshing cards does not count."],
            ["Can I cancel anytime?", "Yes — cancel from the billing portal at any time. You keep Pro access until the end of your billing period."],
            ["Is a credit card required for Free?", "No. The Free plan requires no payment method."],
            ["Do usage counts reset?", "Yes, on the 1st of each month UTC."],
          ].map(([q, a]) => (
            <div key={q} className="px-5 py-4">
              <div className="font-mono text-xs text-green-500 mb-1">{q}</div>
              <div className="font-mono text-xs text-green-800 leading-relaxed">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-[#080c08] px-4 selection:bg-green-500/30">
      <Suspense fallback={<div className="font-mono text-green-600 text-center py-20">Loading billing...</div>}>
        <BillingContent />
      </Suspense>
    </main>
  );
}
