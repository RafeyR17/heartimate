export default function HomeLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto w-full animate-pulse">
      <div className="rounded-2xl h-[320px] bg-white/5 mb-10" />
      <div className="h-6 bg-white/10 rounded w-48 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/5 overflow-hidden">
            <div className="aspect-square bg-white/5" />
            <div className="p-3.5 space-y-2">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
