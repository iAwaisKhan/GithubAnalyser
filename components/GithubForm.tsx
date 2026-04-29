"use client";

import { useState, FormEvent } from "react";

interface Props {
  onSubmit: (username: string) => void;
  loading: boolean;
}

export default function GithubForm({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl" suppressHydrationWarning>
      <div className="flex gap-0 border border-green-500/60 focus-within:border-green-400 transition-colors duration-200 bg-black/60">
        <span className="flex items-center pl-4 text-green-500 font-mono text-sm select-none">
          ~/analyze$
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="enter_github_username"
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
          suppressHydrationWarning
          className="flex-1 bg-transparent px-3 py-3.5 font-mono text-sm text-green-300 placeholder-green-900 outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          suppressHydrationWarning
          className="px-5 py-3.5 bg-green-500 text-black font-mono text-sm font-bold tracking-widest uppercase
            hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors duration-150 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
              RUN
            </span>
          ) : (
            "RUN"
          )}
        </button>
      </div>
    </form>
  );
}
