"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Unknown error";

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div className="font-mono text-4xl text-red-600">!</div>
      <h1 className="font-mono text-xl text-red-400">auth_error</h1>
      <p className="font-mono text-sm text-green-800">{error}</p>
      <Link href="/auth/signin" className="inline-block font-mono text-xs text-green-600 border border-green-500/30 px-4 py-2 hover:border-green-400/60 transition-colors">
        ← try again
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-[#080c08] flex items-center justify-center px-4">
      <Suspense fallback={<div className="font-mono text-green-600">Loading...</div>}>
        <AuthErrorContent />
      </Suspense>
    </main>
  );
}
