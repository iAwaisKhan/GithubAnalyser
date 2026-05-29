"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const PLAN_BADGE: Record<string, string> = {
  free: "border-green-900/50 text-green-800",
  pro: "border-yellow-500/40 text-yellow-400",
  enterprise: "border-purple-500/40 text-purple-400",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin?callbackUrl=/dashboard");
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <main className="min-h-screen bg-[#080c08] flex items-center justify-center">
        <span className="w-6 h-6 border border-green-800 border-t-green-500 rounded-full animate-spin" />
      </main>
    );
  }

  const usagePercent = Math.min(100, Math.round((session.user.analysesUsed / session.user.analysesLimit) * 100));

  return (
    <main className="min-h-screen bg-[#080c08] text-green-400 flex flex-col items-center px-4 py-16">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,0.3) 2px,rgba(0,255,0,0.3) 4px)" }}
      />

      <div className="w-full max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="font-mono text-xs text-green-800 hover:text-green-600 transition-colors">← analyzer</Link>
            <h1 className="font-mono text-2xl font-bold text-green-400 mt-2">
              <span className="text-green-600">&gt;</span> dashboard
            </h1>
          </div>
        </div>

        {/* Profile card */}
        <div className="border border-green-500/30 bg-black/60">
          <div className="px-5 py-3 border-b border-green-500/20">
            <span className="font-mono text-xs text-green-800 uppercase tracking-widest">account</span>
          </div>
          <div className="p-5 flex items-center gap-4">
            {session.user.image && (
              <Image src={session.user.image} alt="avatar" width={48} height={48} className="rounded-full grayscale" />
            )}
            <div className="flex-1">
              <div className="font-mono text-sm font-bold text-green-300">{session.user.name ?? "Unknown"}</div>
              <div className="font-mono text-xs text-green-700 mt-0.5">{session.user.email}</div>
              {session.user.githubUsername && (
                <a href={`https://github.com/${session.user.githubUsername}`} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-[10px] text-green-800 hover:text-green-600 transition-colors">
                  github.com/{session.user.githubUsername}
                </a>
              )}
            </div>
            <span className={`font-mono text-[10px] border px-2 py-1 uppercase tracking-widest ${PLAN_BADGE[session.user.plan] ?? PLAN_BADGE.free}`}>
              {session.user.plan}
            </span>
          </div>
        </div>

        {/* Usage meter */}
        <div className="border border-green-500/30 bg-black/60">
          <div className="px-5 py-3 border-b border-green-500/20">
            <span className="font-mono text-xs text-green-800 uppercase tracking-widest">monthly usage</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-green-700">analyses used</span>
              <span className={usagePercent >= 90 ? "text-red-400" : usagePercent >= 70 ? "text-yellow-400" : "text-green-400"}>
                {session.user.analysesUsed} / {session.user.analysesLimit >= 9999 ? "∞" : session.user.analysesLimit}
              </span>
            </div>
            <div className="h-2 bg-green-500/8 overflow-hidden rounded-sm">
              <div
                className={`h-full transition-all duration-700 ${usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            {usagePercent >= 70 && session.user.plan === "free" && (
              <p className="font-mono text-xs text-yellow-600">
                Running low —{" "}
                <Link href="/billing" className="underline hover:text-yellow-400 transition-colors">upgrade to Pro</Link>
                {" "}for 100 analyses/month.
              </p>
            )}
            <p className="font-mono text-[10px] text-green-900">resets on the 1st of each month</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="border border-green-500/30 bg-black/60">
          <div className="px-5 py-3 border-b border-green-500/20">
            <span className="font-mono text-xs text-green-800 uppercase tracking-widest">quick_actions</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-green-500/8">
            {[
              { label: "analyze profile", href: "/", desc: "run a new analysis" },
              { label: "compare mode ⚔️", href: "/compare", desc: "head-to-head comparison" },
              { label: "upgrade plan ↑", href: "/billing", desc: "unlock more features" },
              { label: "github oauth", href: "/auth/signin", desc: "reconnect github account" },
            ].map(({ label, href, desc }) => (
              <Link key={href} href={href}
                className="bg-black/40 p-4 hover:bg-green-500/5 transition-colors">
                <div className="font-mono text-xs text-green-500">{label}</div>
                <div className="font-mono text-[10px] text-green-900 mt-0.5">{desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Plan limits info */}
        <div className="border border-green-500/20 bg-black/60 px-5 py-4">
          <div className="font-mono text-[10px] text-green-900 space-y-1">
            <div>free plan: 5 analyses/month · pro: $9/mo for 100 · enterprise: $49/mo unlimited</div>
            <div>compare mode and story mode require pro or above</div>
          </div>
        </div>
      </div>
    </main>
  );
}
