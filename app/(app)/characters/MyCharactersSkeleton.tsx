export function MyCharactersSkeleton() {
  return (
    <div className="min-h-full w-full bg-[#080608] animate-pulse">
      <header className="pt-5 px-4 md:pt-10 md:px-12 border-b border-white/[0.06] pb-8">
        <div className="h-3 w-32 bg-white/10 rounded mb-3" />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="h-10 w-56 bg-white/10 rounded" />
            <div className="h-4 w-40 bg-white/10 rounded" />
          </div>
          <div className="h-11 w-44 bg-white/10 rounded-full" />
        </div>
      </header>
      <div className="px-4 md:px-12 py-6 flex flex-wrap gap-3">
        <div className="h-10 w-full max-w-xs bg-white/10 rounded-full" />
        <div className="h-9 w-24 bg-white/10 rounded-full" />
        <div className="h-9 w-24 bg-white/10 rounded-full" />
        <div className="h-9 w-24 bg-white/10 rounded-full" />
        <div className="h-9 w-36 bg-white/10 rounded-lg ml-auto" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 px-4 md:px-12 pb-20">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/5 bg-[#0d0a0e] overflow-hidden flex flex-col"
          >
            <div className="w-full aspect-square bg-white/5" />
            <div className="p-3.5 flex flex-col gap-2.5">
              <div className="h-4 bg-white/10 rounded w-2/3" />
              <div className="h-3 bg-white/10 rounded w-full" />
              <div className="h-3 bg-white/10 rounded w-5/6" />
              <div className="flex gap-1.5 pt-2">
                <div className="h-5 bg-white/10 rounded w-14" />
                <div className="h-5 bg-white/10 rounded w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
