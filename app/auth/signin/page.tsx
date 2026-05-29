"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Provider { id: string; name: string; }

function SignInContent() {
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const error = params.get("error");

  useEffect(() => {
    getProviders().then((p) => setProviders(p ?? {}));
  }, []);

  const handleSignIn = async (providerId: string) => {
    setLoading(providerId);
    await signIn(providerId, { callbackUrl });
  };

  const PROVIDER_ICONS: Record<string, React.ReactNode> = {
    github: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
    google: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,0.3) 2px,rgba(0,255,0,0.3) 4px)" }}
      />

      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="font-mono text-xs text-green-800 tracking-[0.3em] uppercase mb-2">access required</div>
          <h1 className="font-mono text-2xl font-bold text-green-400">
            <span className="text-green-600">&gt;</span> github_analyzer
          </h1>
          <p className="font-mono text-sm text-green-700 mt-2">sign in to analyze profiles</p>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-500/40 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400">
            <span className="text-red-600">AUTH_ERROR:</span>{" "}
            {error === "OAuthCallback" ? "OAuth callback failed — try again" : error}
          </div>
        )}

        {/* Providers */}
        <div className="border border-green-500/30 bg-black/60">
          <div className="px-5 py-3 border-b border-green-500/20">
            <span className="font-mono text-xs text-green-800 uppercase tracking-widest">select_provider</span>
          </div>
          <div className="p-5 space-y-3">
            {Object.values(providers).map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSignIn(provider.id)}
                disabled={!!loading}
                className="w-full flex items-center gap-3 px-4 py-3 border border-green-500/30 text-green-400 font-mono text-sm hover:border-green-400/60 hover:bg-green-500/5 transition-all disabled:opacity-40 cursor-pointer"
              >
                {loading === provider.id ? (
                  <span className="w-4 h-4 border border-green-600 border-t-green-400 rounded-full animate-spin shrink-0" />
                ) : (
                  <span className="shrink-0 text-green-600">{PROVIDER_ICONS[provider.id] ?? "○"}</span>
                )}
                <span>continue with {provider.name}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="font-mono text-[10px] text-green-900 text-center">
          by signing in you agree to our terms · free plan: 5 analyses/month
        </p>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#080c08] flex items-center justify-center px-4">
      <Suspense fallback={<div className="font-mono text-green-600">Loading...</div>}>
        <SignInContent />
      </Suspense>
    </main>
  );
}
