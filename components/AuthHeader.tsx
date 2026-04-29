"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const PLAN_COLORS = {
  free: "text-green-800 border-green-900/50",
  pro: "text-yellow-400 border-yellow-500/40",
  enterprise: "text-purple-400 border-purple-500/40",
};

export default function AuthHeader() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="fixed top-0 right-0 p-4 z-40">
        <div className="w-6 h-6 border border-green-900 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed top-0 right-0 p-4 z-40">
        <button
          onClick={() => signIn()}
          className="font-mono text-xs text-green-700 border border-green-500/20 px-3 py-1.5 hover:border-green-500/50 hover:text-green-500 transition-colors cursor-pointer"
        >
          sign in
        </button>
      </div>
    );
  }

  const usagePercent = Math.round((session.user.analysesUsed / session.user.analysesLimit) * 100);
  const planColor = PLAN_COLORS[session.user.plan] ?? PLAN_COLORS.free;

  return (
    <div className="fixed top-0 right-0 p-4 z-40">
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 border border-green-500/20 bg-black/80 px-3 py-2 hover:border-green-500/40 transition-colors cursor-pointer"
        >
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "user"}
              width={20} height={20}
              className="rounded-full grayscale"
            />
          )}
          <span className="font-mono text-xs text-green-600 max-w-[120px] truncate">
            {session.user.name ?? session.user.email}
          </span>
          <span className={`font-mono text-[9px] border px-1.5 py-0.5 uppercase tracking-wider ${planColor}`}>
            {session.user.plan}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 border border-green-500/30 bg-[#080c08] shadow-xl z-50">
            {/* Usage meter */}
            <div className="px-4 py-3 border-b border-green-500/10">
              <div className="flex justify-between font-mono text-[10px] text-green-800 mb-1.5">
                <span>analyses used</span>
                <span>{session.user.analysesUsed} / {session.user.analysesLimit}</span>
              </div>
              <div className="h-1 bg-green-500/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            </div>

            <div className="py-1">
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 font-mono text-xs text-green-700 hover:text-green-400 hover:bg-green-500/5 transition-colors">
                dashboard
              </Link>
              <Link href="/billing" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 font-mono text-xs text-green-700 hover:text-green-400 hover:bg-green-500/5 transition-colors">
                {session.user.plan === "free" ? "upgrade plan ↑" : "manage billing"}
              </Link>
              <Link href="/compare" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 font-mono text-xs text-green-700 hover:text-green-400 hover:bg-green-500/5 transition-colors">
                compare mode ⚔️
              </Link>
            </div>

            <div className="border-t border-green-500/10 py-1">
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="w-full text-left px-4 py-2 font-mono text-xs text-red-800 hover:text-red-500 hover:bg-red-500/5 transition-colors cursor-pointer"
              >
                sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
