"use client";

import Image from "next/image";

interface Profile {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

interface Props {
  profile: Profile;
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-green-500/30 px-5 py-3 text-center">
      <div className="font-mono text-xl text-green-400 font-bold tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="font-mono text-xs text-green-700 uppercase tracking-widest mt-0.5">
        {label}
      </div>
    </div>
  );
}

export default function ProfileCard({ profile }: Props) {
  return (
    <div className="space-y-px">
      {/* Header */}
      <div className="border border-green-500/40 bg-black/60 p-6 flex gap-5 items-start">
        <div className="relative shrink-0">
          <div className="w-16 h-16 border-2 border-green-500/60 overflow-hidden">
            <Image
              src={profile.avatar_url}
              alt={profile.login}
              width={64}
              height={64}
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <a
              href={profile.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-lg font-bold text-green-300 hover:text-green-100 transition-colors"
            >
              @{profile.login}
            </a>
            {profile.name && (
              <span className="font-mono text-sm text-green-700">{profile.name}</span>
            )}
          </div>
          {profile.bio && (
            <p className="font-mono text-xs text-green-600 mt-1.5 leading-relaxed line-clamp-2">
              // {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-green-500/10">
        <StatBox label="Repos" value={profile.public_repos} />
        <StatBox label="Followers" value={profile.followers} />
        <StatBox label="Following" value={profile.following} />
      </div>
    </div>
  );
}
