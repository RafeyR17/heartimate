/**
 * Layout breakpoints — aligned with Tailwind defaults and `md:` sidebar shell.
 * CSS tokens: `app/globals.css` (`--bp-*`).
 */
export const BP_SM_MIN = 640
export const BP_MD_MIN = 768
export const BP_LG_MIN = 1024
export const BP_XL_MIN = 1280

/** Viewport width < 768px (guest bottom nav, app tab bar, drawer nav). */
export const BP_MOBILE_MAX = BP_MD_MIN - 1

export type BreakpointBand = 'mobile' | 'tablet' | 'desktop'

export function breakpointBand(widthPx: number): BreakpointBand {
  if (widthPx < BP_MD_MIN) return 'mobile'
  if (widthPx < BP_LG_MIN) return 'tablet'
  return 'desktop'
}
