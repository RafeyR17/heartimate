export default function ExploreLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto w-full">
      <div className="animate-pulse flex flex-col gap-6">
        <div className="h-10 bg-white/5 rounded-lg w-64" />
        <div className="h-4 bg-white/5 rounded w-96 max-w-full" />
        <div className="h-24 bg-white/5 rounded-2xl border border-white/5" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-[#0d0a0e] overflow-hidden">
              <div className="aspect-square bg-white/5" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 bg-white/10 rounded w-2/3" />
                <div className="h-3 bg-white/10 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
