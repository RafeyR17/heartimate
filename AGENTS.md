<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Product routes (Heartimate)

**App pages that exist:** `/`, `/login`, `/signup`, `/onboarding`, `/home`, `/explore`, `/favorites`, `/characters` (owned list), `/characters/[id]`, `/characters/create`, `/characters/[id]/edit`, `/chat/[chatId]`, `/profile` (tabs via `?tab=`), `/personas`, `/personas/create`, `/personas/[id]/edit`, `/sso-callback`, `/terms`, `/privacy`.

**Not in scope — do not implement or audit as missing features:**
- `/dashboard` (use `/home` and `/profile` instead)
- In-app notifications: no `/api/notifications`, no `notifications` table, no bell/dropdown UI (`components/ToastProvider.tsx` is ephemeral UI feedback only)

**API routes:** see `app/api/` (chat, chats, characters, personas, users/me, onboarding, reports, messages, `GET /api/health`, `GET /api/openapi`). Canonical list: `lib/api-routes.ts`. No notifications API.

**API conventions:**
- **Handler pattern (required):** Every `app/api/**/route.ts` handler uses **`runApiHandler`** from `lib/observability/api-route.ts`. Authenticated routes wrap the export with **`withAuthedApi`** from `lib/with-authed-api.ts` (which calls `createAuthedDb()` once and returns 401 if missing). Do **not** call `createAuthedDb()` directly in route files — only `with-authed-api.ts` and server pages (`requireAuthedServerDb`) use it. Public JSON routes (e.g. `GET /api/onboarding`, `GET /api/health`, `GET /api/openapi`, cron) use `runApiHandler` without `withAuthedApi`; use `createSupabaseAnonClient()` or service role inside the handler as needed.
- **Contract:** OpenAPI at `openapi/heartimate.openapi.json`; served at `GET /api/openapi`. TypeScript types in `lib/api-contract.ts` (`ChatPostBody`, `MessagesPageResponse`, `parseChatStreamMeta()`, etc.).
- JSON routes return `{ success, ... }` via `apiSuccess` / `apiError` in `lib/api.ts`.
- **Observability:** `x-request-id` on every API response (set in `proxy.ts`, propagated in `runApiHandler`). Structured JSON logs via `lib/observability/` (`request.start`, `request.complete`, `span.*`). Hot path `POST /api/chat` uses spans: `auth`, `idempotency.claim`, `daily_quota`, `rate_limit`, `llm.stream_start`, `finalize_turn`.
- `POST /api/chat` streams **plain text** via `streamTextResponse()` (not JSON); relationship fields are `X-*` response headers (see `CHAT_STREAM_HEADERS` in `lib/api-contract.ts`).
- Auth + DB: `createAuthedDb()` in `lib/authed-db.ts` — returns `{ supabase, user, clerkId }`. Use **`supabase`** (Clerk JWT + RLS) for all table access. Service role is internal via `getServiceRoleClient()` in `lib/service-role.ts` (bootstrap, rate/idempotency ledgers only). Requires Clerk JWT template `supabase` + Supabase Third-Party Auth (see `supabase/README.md`). Local dev without JWT: `SUPABASE_RLS_BYPASS=true` (non-production only).
- Validation: `parseBody` / `parseJsonBody` + Zod in `lib/api-schemas.ts`; multipart limits in `lib/api-validation.ts`.
- Onboarding starters: `GET /api/onboarding` returns up to 3 public characters from DB (`lib/onboarding-starters.ts`).
- Chat rate limits: `assertChatApiRateLimit()` records every `POST /api/chat` in `chat_rate_events` (30/min total, 5/min for `omitUserPersist`). Fails closed (503) if the ledger RPC errors.
- **Daily chat quota (beta):** `assertDailyChatQuota()` in `lib/chat-daily-quota.ts` — counts `chat_rate_events` since UTC midnight before each turn. Default **20** messages/day when `CHAT_DAILY_MESSAGE_LIMIT` is unset; `0` or `unlimited` disables. Returns 429 with `code: daily_chat_limit`. NSFW is **not** blocked by quota — use `character.is_nsfw` + optional `OPENROUTER_MODEL_NSFW` (see `docs/LLM.md`).
- **Onboarding 18+:** `POST /api/onboarding` requires `isAdult: true` (Zod) and sets `users.adult_confirmed_at`; NSFW chat is not blocked server-side after signup.
- Write API rate limits: `assertApiRateLimit(userId, action)` in `lib/api-rate-limits.ts` — uses service role internally; per-action caps in `api_rate_events` (`20240532_api_rate_ledger.sql`) on reports, character/persona/chat/message CRUD, likes, fork, onboarding, profile PATCH.
- Chat turn persistence: **compensating** strategy — user row before LLM, rollback on stream/finalize failure; `finalize_chat_turn` RPC for assistant + chat counters. See `lib/chat-turn.ts`.
- Message history: `GET /api/chats/[chatId]/messages?limit=50&before=<messageId>` (default 50, max 100). UI page + refetch use 50; “Load older” uses `before` cursor.
- Chat idempotency (optional): client sends `Idempotency-Key` (8–128 chars, `[a-zA-Z0-9_-]`); server dedupes via `chat_idempotent_requests` (`20240530_chat_idempotency.sql`). Replay returns cached stream + `X-*` headers; duplicate in-flight → 409; claim/replay cache errors → **503** (fail closed).
- Message ops: `patch_user_message`, `delete_owned_message`, `reset_chat_messages` RPCs (`20240533_message_ops_atomic.sql`) atomically mutate messages and sync `chats.total_messages` / `last_message_at`.
- Tests: `npm test` (unit + route mocks; **excludes** `tests/llm-eval/live.test.ts`). `npm run test:integration` hits real Supabase when `INTEGRATION_TEST=1` and env keys are set (see `supabase/README.md`). `npm run test:llm-eval` runs offline LLM scenarios/golden; `npm run test:llm-eval:live` needs `OPENROUTER_API_KEY`.

## Testing and coverage (pragmatic)

| Layer | Target |
|-------|--------|
| `lib/api-schemas`, `lib/chat-limits`, `lib/chat-moderation` | High — edge cases + failure paths |
| Each `app/api/**/route.ts` | At least **401 unauthenticated** + **one success or expected 4xx** per handler |
| UI | Critical parsers only (e.g. `parseChatStreamMeta` in `lib/api-contract.test.ts`) |

- **Unit tests** mock all external IO: Supabase (`lib/test/mock-supabase.ts`), Clerk (`createAuthedDb` vi.mock), LLM, PostHog, OpenRouter. `vitest.setup.ts` sets `CHAT_MODERATION_DISABLED=true` and default service-role RPC success.
- **React hooks:** `react-hooks/purity` and `react-hooks/set-state-in-effect` are **error** repo-wide; prefer render-time sync, lazy `useState` init, or async-only setState in effects.
- **Logging:** server `lib/` code uses `serverLog` from `lib/server-log.ts` (JSON lines), not ad-hoc `console.error`.
- **Chat route:** `app/api/chat/route.ts` orchestrates; finalize + memory live in `lib/chat-route/`. RPC JSON parsing in `lib/rpc-parse.ts`.
- **Pre-commit (optional):** `npm run hooks:install` then commits run `lint-staged` (eslint + related vitest for staged routes/lib). Skip with `HUSKY=0 git commit`.
- **LLM eval:** default CI and `npm test` run offline `tests/llm-eval/{scenarios,golden}.test.ts` only; live OpenRouter is `npm run test:llm-eval:live`.

**Not in default `npm test` or CI `test` job** (separate configs; zero coverage unless run explicitly):

| Suite | Command | Skip when |
|-------|---------|-----------|
| `tests/integration/smoke.test.ts` | `npm run test:integration` | `hasIntegrationEnv()` false — needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (`INTEGRATION_TEST=1` is set by the script + `vitest.integration.config.ts`) |
| `tests/integration/rls-idor.test.ts` | same | above + `CLERK_SECRET_KEY` (`hasClerkIntegrationEnv`) |
| `tests/integration/idor-api.test.ts` | same | same as RLS IDOR |
| `tests/llm-eval/live.test.ts` | `npm run test:llm-eval:live` | no `OPENROUTER_API_KEY` (`describe.skipIf`) |

Default `vitest.config.ts` **does not include** `tests/integration/**` (separate `vitest.integration.config.ts`). It **excludes** only `tests/llm-eval/live.test.ts` from the `tests/llm-eval/**` glob.

## Bundle and performance budgets

First-load JS gzip targets (see `scripts/check-bundle-budgets.mjs`):

| Route | Budget |
|-------|--------|
| `/chat/[chatId]` | under 200 KB |
| `/explore` | under 150 KB |
| `/characters/[id]` | under 180 KB |

- **Local:** `npm run build` then `npm run check:bundle`. Interactive analysis: `npm run analyze` (Turbopack) or `npm run analyze:webpack`.
- **CI:** `.github/workflows/bundle-weekly.yml` runs `build`, `check:bundle`, and `check:perf` every Monday (also `workflow_dispatch`).
- **Perf checklist:** `npm run check:perf` — loads `.env.local` when present; env + required migration files (warns if `NEXT_PUBLIC_SUPABASE_URL` still missing).
- **npm `devdir` warning:** Cursor/sandbox may set `npm_config_devdir` for node-gyp; npm prints `Unknown env config "devdir"` — harmless, not from this repo. CI does not set it.
- **Production build:** `npm run build` must finish with `.next/BUILD_ID` present (CI `test` job runs build after typecheck/tests).
- **Lighthouse mobile:** job `lighthouse-mobile` in `.github/workflows/ci.yml` — `check:lighthouse` after `build` (warn thresholds: LCP ≤ 4s, CLS ≤ 0.1).

## Mobile QA

Manual device matrix, flow checklists, and mobile perf notes (landing LCP on 4G): **`docs/MOBILE_QA.md`**.

- **Breakpoints:** mobile &lt; 768px, tablet `md:`–`lg:`, desktop `lg:` — tokens in `app/globals.css`, **`docs/BREAKPOINTS.md`**, `lib/breakpoints.ts`. Sidebar shell uses **`md:` (768px)**.
- **Touch targets:** `npm run check:touch-targets` — see `docs/TOUCH_TARGETS.md`.
- **App mobile nav:** `AppBottomTabBar` (Home | Explore | Profile) on signed-in routes; hamburger drawer still available. Guest: `PublicNav` bottom bar.
- **Chat mobile:** `visualViewport` composer offset, `--chat-overlay-bottom` for scroll FAB, `MobileMessageSheet` for long-press actions.
- **Lighthouse mobile (CI):** `npm run build && npm run check:lighthouse` — LCP/CLS warns on `/`, `/explore` (see `lighthouserc.cjs`). `/chat/*` requires auth (local `LIGHTHOUSE_URLS` only).
- **Reduced motion:** `prefers-reduced-motion` disables landing reveals, `.landing-lift`, app-shell enter, chat motion (see `app/globals.css`).

## Database

- Schema lives in `supabase/migrations/` (start with `20240518_base_schema.sql`). See `supabase/README.md` for table list and RLS summary.
- **App RSC pages (logged-in):** `requireAuthedServerDb()` in `lib/server-auth.ts` — same RLS client as API routes. **Public catalog:** `createSupabaseAnonClient()` (e.g. explore). Service role: `getServiceRoleClient()` only (see `lib/service-role.ts`).

## Repo layout

- **Single Next.js app** at repo root (`app/`, `components/`, `lib/`). There is no nested `clerk-nextjs/` scaffold — do not create one.
- **Auth routing:** `proxy.ts` (Next.js 16; replaces deprecated `middleware.ts`). Clerk `clerkMiddleware` + `auth.protect()` on protected routes.
- **Fonts:** System/web-safe stacks in `app/globals.css` (no `next/font/google` fetch at build time). Optional: self-host fonts under `public/fonts` later.
