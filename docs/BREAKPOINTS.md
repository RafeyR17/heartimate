# Layout breakpoints

Aligned with **Tailwind v4 defaults** and `app/globals.css` tokens.

| Band | Width | Tailwind | Chrome |
|------|-------|----------|--------|
| **Mobile** | &lt; 768px | default, `max-md:` | Guest `PublicNav` + bottom tabs; app **drawer** + **bottom tab bar** (`AppBottomTabBar`); no sidebar |
| **Tablet** | 768px – 1023px | `md:` … `lg:` | Fixed **sidebar** (220px), topbar; bottom tab bar hidden (`md:hidden`) |
| **Desktop** | ≥ 1024px | `lg:` | Same shell as tablet; wider content |

## Tokens (`:root`)

| Token | Value |
|-------|-------|
| `--bp-sm` | 640px |
| `--bp-md` | 768px — **sidebar / `md:`** |
| `--bp-lg` | 1024px |
| `--bp-xl` | 1280px |
| `--bp-mobile-max` | 767px |

## TypeScript

`lib/breakpoints.ts` — `BP_MD_MIN`, `breakpointBand()`, etc.

## App mobile nav

- **Guest:** `PublicNav` bottom bar — Explore | Log in | Sign up
- **Signed-in:** `AppBottomTabBar` — Home | Explore | Profile (hidden on `/chat/*` and `/characters/[id]` where a page footer exists)
- **Hamburger:** still available in top bar for Personas, Create, recent chats, settings
