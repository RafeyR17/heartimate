# Touch targets (WCAG 2.5.5)

Minimum interactive size: **44×44 CSS pixels**.

## Utilities

| Class / export | Use |
|----------------|-----|
| `.touch-target` (`app/globals.css`) | Generic buttons, links styled as controls |
| `iconTouchClass` (`lib/touch-targets.ts`) | Icon-only buttons (menu, copy, close) |
| `min-h-[44px]` | Full-width row actions (sheets, bottom nav) |
| `.btn-primary` / `.btn-secondary` | Defined in `app/globals.css` with `min-h-[44px]` |

Text fields may use `min-h-[40px]` for single-line appearance; the **send** and **icon** controls beside them must still be ≥ 44px.

## Horizontal carousels

Use `HorizontalCarousel` + `carouselSnapItemClass` from `components/ui/horizontal-carousel.tsx` for `overflow-x` rows (snap, peek padding, mobile fade edges).

## Audit

```bash
npm run check:touch-targets
```

Heuristic scan of `app/`, `components/`, `lib/` — fix reported lines or document exceptions.

## Chat overlays

`#chat-immersive-container` sets `--chat-overlay-bottom` via `useChatViewportSync` so the scroll FAB sits above the composer and mobile keyboard.
