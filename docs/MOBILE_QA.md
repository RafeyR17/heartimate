# Mobile QA matrix

Manual QA before release or large UI changes. Complements automated checks (`npm test`, `npm run check:touch-targets`, `npm run check:bundle`).

## Device matrix

| Device | OS | Browser | Primary flows |
|--------|-----|---------|----------------|
| iPhone SE (375×667) or iPhone 15 | iOS 17+ | Safari | Login, onboarding, explore, chat keyboard, NSFW character CTA |
| Pixel 7 / 8 (412×915) | Android 14+ | Chrome | Same as iOS **+** system back gesture (chat → home, explore → back) |
| iPad (10.9" or Air) | iPadOS 17+ | Safari | Sidebar appears at **`md:` (768px)**; verify app shell vs public nav, landscape chat |

### Simulator / DevTools

- Safari: Xcode Simulator → iPhone SE + iPhone 15.
- Chrome: DevTools → device toolbar → Pixel 7, responsive 320×568 for narrow regression.
- iPad: 820×1180 or 1024×1366; confirm `md:` breakpoint toggles sidebar (`SidebarClient` visible, `PublicNav` guest-only on public routes).

---

## Flow checklists

### Auth (`/login`, `/signup`, `/sso-callback`)

- [ ] Clerk UI usable; inputs not hidden behind keyboard (16px font on mobile inputs in `globals.css`).
- [ ] Safe areas: notch/home indicator (`viewportFit: cover` in root `app/layout.tsx`).
- [ ] Redirect after sign-in lands on `/home` or intended `redirect_url`.
- [ ] **Pixel:** hardware back from OAuth/SSO returns to app without blank WebView.

### Onboarding (`/onboarding`)

- [ ] All steps reachable; kink chips **wrap** and are ≥ 44px tall (`min-h-[44px]`).
- [ ] Primary CTA reachable without horizontal scroll.
- [ ] Starter character carousel (step 4) snaps horizontally on phone.

### Guest public (`/`, `/explore`, `/characters/[id]`)

- [ ] **Guest nav:** bottom tab bar (Explore | Log in | Sign up), hamburger drawer, explore search in top bar.
- [ ] Horizontal carousels (home recent chats, trending pills, landing trending) show **peek** + scroll snap; fade hints scrollability.
- [ ] **Character detail:** lore / personality / scenario readable (`max-w-prose`, line-height ~1.75); mobile bottom bar (like + chat) does not cover tab content.
- [ ] **NSFW character CTA:** fixed bottom bar tappable (44px targets); persona modal opens; signed-out user → login with `redirect_url`.
- [ ] **Signed-in** on public routes uses **app shell** (sidebar + topbar), same as `/home`.

### App shell (`/home`, `/profile`, `/explore` when signed in)

- [ ] **Bottom tab bar:** Home | Explore | Profile (`AppBottomTabBar`) — 44px targets; hidden on `/chat/*` and `/characters/[id]` (page footer).
- [ ] Hamburger still opens drawer (Personas, Create, recent chats).
- [ ] Profile avatar in top bar.
- [ ] **iPad ≥768px (`md:`):** fixed sidebar, no bottom tab bar, no duplicate mobile drawer over content.
- [ ] First app-shell visit per tab: subtle enter animation (`AppShellTransition`); disabled with **prefers-reduced-motion**.
- [ ] **Reduced motion:** System Settings → Accessibility → Reduce Motion — landing cards do not lift; hero typewriter static.

### Chat (`/chat/[chatId]`)

- [ ] `visualViewport`: composer stays above keyboard; message list not trapped under input.
- [ ] Scroll-to-bottom FAB sits above composer (`--chat-overlay-bottom`).
- [ ] Long-press message → bottom sheet (Copy / Edit / Delete / Regenerate); one-handed reach.
- [ ] Send/stop buttons ≥ 44px (`iconTouchClass`).

### Character create (`/characters/create`)

- [ ] Tag dropdown at **320px** width: `w-[min(480px,calc(100vw-1.5rem))]` — no horizontal clip off-screen.
- [ ] Tag chips in dropdown ≥ 44px touch height.

### Touch targets (spot check)

```bash
npm run check:touch-targets
```

See `docs/TOUCH_TARGETS.md`.

---

## Performance on mobile (scored with bundle / LCP work)

| Risk | Detail | Mitigation / verify |
|------|--------|---------------------|
| **Chat route JS** | Budget &lt; 200 KB gzip first load (`scripts/check-bundle-budgets.mjs`). | `npm run build && npm run check:bundle` |
| **Landing / login LCP** | Hero uses `hero-bg.webp` (`lib/public-images.ts`); `sizes="100vw"` on full-bleed images (landing, login, signup). | Files must stay compressed (WebP). **4G LCP:** Chrome DevTools → Performance → Slow 4G; target LCP &lt; 2.5s on `/` or document exception. Vercel Speed Insights in production. |
| **Character avatars** | Chat/list use smaller `sizes` (32–48px). | Avoid `100vw` on non-hero images. |

### Quick perf commands

```bash
npm run build
npm run check:bundle
npm run check:perf
npm run check:lighthouse   # mobile LCP/CLS on / and /explore (needs build)
```

CI runs `check:lighthouse` in the `lighthouse-mobile` job. Chat route needs a signed-in URL via `LIGHTHOUSE_URLS` for local runs only.

### Breakpoints

See **`docs/BREAKPOINTS.md`** — mobile &lt; 768px, sidebar at `md:` (768px).

---

## Regression triggers

Re-test this matrix when changing:

- `components/PublicNav.tsx`, `components/AppShell.tsx`, `components/SidebarClient.tsx`, `components/TopbarClient.tsx`
- `app/(app)/chat/[chatId]/*` (composer, message list, mobile sheet)
- `app/(public)/characters/[id]/*`, `app/onboarding/page.tsx`
- `components/ui/horizontal-carousel.tsx`
- `app/layout.tsx` viewport metadata
- `next.config.ts` (images / webpack async chunks)

---

## Sign-off (release template)

| Tester | Date | Build / commit | iOS Safari | Android Chrome | iPad |
|--------|------|----------------|------------|----------------|------|
| | | | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |

Notes:
