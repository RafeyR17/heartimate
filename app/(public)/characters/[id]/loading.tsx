export default function CharacterLoading() {
  return (
    <div className="min-h-screen bg-[#080608] animate-pulse">
      <div className="h-[50vh] bg-white/5" />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="h-8 bg-white/10 rounded w-1/3" />
        <div className="h-4 bg-white/5 rounded w-2/3" />
        <div className="h-32 bg-white/5 rounded-2xl" />
      </div>
    </div>
  )
}
