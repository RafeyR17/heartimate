/** Static fallback while PublicNav suspends on search params. */
export function PublicNavShell() {
  return (
    <nav
      aria-hidden
      className="fixed top-0 w-full z-50 safe-top h-14 md:h-20 bg-gradient-to-b from-bg/90 to-transparent backdrop-blur-sm border-b border-white/5"
    />
  )
}
