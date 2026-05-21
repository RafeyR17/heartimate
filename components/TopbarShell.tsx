/** Sticky topbar placeholder while TopbarClient suspends on search params. */
export function TopbarShell() {
  return (
    <div
      aria-hidden
      className="h-14 md:h-[60px] border-b border-white/5 bg-[rgba(8,6,8,0.8)] backdrop-blur shrink-0 safe-top"
    />
  )
}
