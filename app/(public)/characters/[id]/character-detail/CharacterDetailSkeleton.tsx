export function CharacterDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 pb-28 animate-pulse">
      <div className="hidden lg:block h-16 rounded-2xl bg-white/5 mb-6" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="h-20 rounded-xl bg-white/5" />
        <div className="h-20 rounded-xl bg-white/5" />
        <div className="h-20 rounded-xl bg-white/5" />
      </div>
      <div className="h-48 rounded-xl bg-white/5" />
    </div>
  )
}
