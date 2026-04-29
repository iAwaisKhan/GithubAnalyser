"use client";

function Pulse({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-green-500/8 ${className}`} style={style} />;
}

export function ProfileCardSkeleton() {
  return (
    <div className="border border-green-500/20 bg-black/60">
      <div className="p-6 flex gap-5 items-start">
        <Pulse className="w-16 h-16 shrink-0" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-5 w-40" />
          <Pulse className="h-3 w-24" />
          <Pulse className="h-4 w-64 mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px bg-green-500/10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-5 py-3 text-center space-y-1">
            <Pulse className="h-6 w-12 mx-auto" />
            <Pulse className="h-2 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RepoCardSkeleton() {
  return (
    <div className="border border-green-500/10 bg-black/40 p-5 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-baseline">
          <Pulse className="h-3 w-6" />
          <Pulse className="h-4 w-36" />
        </div>
        <Pulse className="h-8 w-16" />
      </div>
      <Pulse className="h-px w-full" />
      <Pulse className="h-3 w-3/4" />
      <div className="border-l-2 border-green-500/10 pl-3 space-y-1">
        <Pulse className="h-2 w-16" />
        <Pulse className="h-3 w-full" />
        <Pulse className="h-3 w-5/6" />
      </div>
      <div className="flex gap-4">
        <Pulse className="h-2 w-20" />
        <Pulse className="h-2 w-12" />
        <Pulse className="h-2 w-12" />
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="border border-green-500/20 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/10">
        <Pulse className="h-3 w-40" />
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-px bg-green-500/8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 space-y-1 text-center">
              <Pulse className="h-8 w-12 mx-auto" />
              <Pulse className="h-2 w-16 mx-auto" />
            </div>
          ))}
        </div>
        <div className="flex gap-[2px] flex-wrap">
          {Array.from({ length: 91 }).map((_, i) => (
            <Pulse key={i} className="w-[11px] h-[11px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LanguageChartSkeleton() {
  return (
    <div className="border border-green-500/20 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/10">
        <Pulse className="h-3 w-36" />
      </div>
      <div className="p-5 space-y-3">
        <Pulse className="h-3 w-full" />
        {[80, 60, 45, 30, 20].map((w, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Pulse className="h-3 w-20" />
              <Pulse className="h-3 w-8" />
            </div>
            <Pulse className="h-[3px]" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIAnalysisSkeleton() {
  return (
    <div className="border border-green-500/20 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/10">
        <Pulse className="h-3 w-24" />
      </div>
      <div className="p-5 space-y-4">
        <div className="border border-green-500/10 p-4 space-y-2">
          <Pulse className="h-2 w-32" />
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-5/6" />
          <Pulse className="h-3 w-4/6" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((col) => (
            <div key={col} className="space-y-2">
              <Pulse className="h-2 w-20" />
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex gap-2">
                  <Pulse className="h-3 w-3 shrink-0" />
                  <Pulse className="h-3 flex-1" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ResumeSkeleton() {
  return (
    <div className="border border-green-500/20 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/10 flex justify-between">
        <Pulse className="h-3 w-40" />
        <Pulse className="h-6 w-20" />
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <Pulse key={i} className="h-10 w-24" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <Pulse className="h-3 w-3 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <Pulse className="h-3 w-full" />
                <Pulse className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PersonaSkeleton() {
  return (
    <div className="border border-green-500/20 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/10">
        <Pulse className="h-3 w-28" />
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <Pulse className="w-10 h-10 rounded" />
          <div className="space-y-2">
            <Pulse className="h-5 w-32" />
            <Pulse className="h-3 w-56" />
          </div>
        </div>
        <div className="border-l-2 border-green-500/10 pl-3 space-y-1">
          <Pulse className="h-2 w-16" />
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-4/5" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3].map((i) => <Pulse key={i} className="h-5 w-24" />)}
        </div>
      </div>
    </div>
  );
}

/** Full-page analysis skeleton shown while loading */
export function AnalysisSkeleton() {
  return (
    <div className="w-full max-w-2xl mt-10 space-y-4">
      <ProfileCardSkeleton />
      <PersonaSkeleton />
      <AIAnalysisSkeleton />
      <ResumeSkeleton />
      <LanguageChartSkeleton />
      <HeatmapSkeleton />
      {[1, 2, 3].map((i) => <RepoCardSkeleton key={i} />)}
    </div>
  );
}
