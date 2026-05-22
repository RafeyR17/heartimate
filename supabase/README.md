# Supabase schema

Apply migrations in filename order (`20240518_*` → `20240533_*`) on a fresh project.

## Migration timeline

| File | Purpose |
|------|---------|
| `20240518_base_schema.sql` | Core tables: `users`, `characters`, `character_likes`, `chats`, `messages`, `chat_memory`; `avatars` storage bucket |
| `20240519_reports_and_fork.sql` | `reports`; fork columns on `characters` |
| `20240520_personas.sql` | `personas`; `chats.persona_id` |
| `20240521_users_bio.sql` | `users.bio` |
| `20240522_retention.sql` | Streak columns on `users`; affection / `total_messages` on `chats` |
| `20240523_character_likes_count_trigger.sql` | Keeps `characters.likes_count` in sync |
| `20240524_explore_random_character_sample.sql` | `explore_public_characters_random` RPC |
| `20240525_rls_and_chat_limits.sql` | RLS enabled on all app tables; public read policy for catalog |
| `20240526_chat_rate_ledger.sql` | `chat_rate_events` ledger + `try_acquire_chat_rate_slot` for `/api/chat` rate limiting |
| `20240527_chat_finalize_turn.sql` | `finalize_chat_turn` RPC — atomic assistant insert + chat update |
| `20240528_create_chat_with_greeting.sql` | `create_chat_with_greeting` RPC — chat + greeting message + `chat_count` bump |
| `20240529_chat_rate_regenerate_kind.sql` | `chat_rate_events.kind` + regenerate cap on `try_acquire_chat_rate_slot` |
| `20240530_chat_idempotency.sql` | `chat_idempotent_requests` + claim/complete/fail RPCs for `POST /api/chat` idempotency |
| `20240530_database_hardening.sql` | CHECK constraints, GIN/partial indexes, grant cleanup, `purge_chat_rate_events`, hardened explore RPC, avatars storage read policy, seed starter characters |
| `20240531_clerk_rls_policies.sql` | Clerk JWT helpers (`clerk_sub`, `current_app_user_id`) + owner policies on user data; RPC caller checks |
| `20240532_api_rate_ledger.sql` | `api_rate_events` + `try_acquire_api_rate_slot` for non-chat write routes; `purge_api_rate_events` |
| `20240533_message_ops_atomic.sql` | Atomic message patch/delete/clear + `sync_chat_message_stats` for counter consistency |
| `20240601_chat_last_message_preview.sql` | `chats.last_message_preview` / `last_message_role` denormalization |
| `20240602_purge_rate_ledgers.sql` | `purge_rate_ledgers()` — single RPC for daily cron |
| `20240603_perf_rpc_hot_paths.sql` | `get_sidebar_context`, `get_chat_turn_context` — one round-trip for layout + chat turn |

## Clerk + Supabase (API routes)

1. **Clerk:** Create a JWT template named `supabase` (or set `CLERK_SUPABASE_JWT_TEMPLATE`). Claims must include `sub` = Clerk user id (default).
2. **Supabase:** Dashboard → Authentication → Third-Party Auth → add **Clerk** (issuer matches your Clerk instance).
3. **App:** `createAuthedDb()` issues requests with Clerk JWT on the **anon** key (`supabase` client). RLS enforces ownership even if a route omits `.eq('user_id', …)`.
4. **Service role:** `getServiceRoleClient()` in `lib/service-role.ts` — `getOrCreateUser`, `uploadPreparedAvatar` (storage), rate ledgers, and idempotency RPCs. Never use for routine table CRUD.
5. **Local dev without JWT:** `SUPABASE_RLS_BYPASS=true` in `.env.local` (non-production only) falls back to service role for `supabase` — logs a warning.

## Row level security (effective after `20240531`)

All listed tables have **RLS enabled**.

| Role | Access |
|------|--------|
| `anon` | Public `characters` where `is_public = true` |
| `authenticated` (Clerk JWT) | Own `users` row; own chats/messages/memory/personas/likes/reports; characters public or owned |
| `service_role` | Bypasses RLS — narrow server use only |

Ledger tables (`chat_rate_events`, `api_rate_events`, `chat_idempotent_requests`) have no policies for `authenticated` (denied by default).

- **Chat:** `try_acquire_chat_rate_slot` on `chat_rate_events` (`POST /api/chat` only).
- **Other writes:** `try_acquire_api_rate_slot` on `api_rate_events` (reports, characters, personas, chats, messages, likes, fork, onboarding, profile). Caps in `lib/api-rate-limits.ts`.
- **Maintenance:** `purge_chat_rate_events()` and `purge_api_rate_events()` (service role, ~7 day retention).

### Starter characters (`20240530`)

Public seed rows (stable IDs `hm-seed-lyra`, `hm-seed-kai`, `hm-seed-aria`, `hm-seed-seraph`) owned by `hm-seed-user` (`clerk_id = __heartimate_seed__`). Onboarding loads the first 3 public characters by `created_at` — these seeds satisfy empty databases. Re-run is idempotent (`ON CONFLICT DO NOTHING`).

### Maintenance

- **Rate ledger retention:** call `select public.purge_chat_rate_events();` daily (default: delete rows older than 7 days). Grant: `service_role` only.
- **Types (optional):** `supabase gen types typescript --local > lib/database.types.ts`

## Local setup

```bash
# Supabase CLI (optional)
supabase db push
```

Or run each `.sql` file in order in the Supabase SQL editor.

## Integration tests (path to 10/10)

Against a real project with all migrations applied:

```bash
# .env.local (repo root) must include:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
npm run test:integration
```

Vitest loads `.env` then `.env.local` via `vitest.integration.setup.ts` (Next.js does this automatically; Vitest does not).

Smoke suite (`tests/integration/smoke.test.ts`): anon public catalog, explore RPC, API rate ledger RPC, `create_chat_with_greeting`. Skipped when `INTEGRATION_TEST` is unset.

## Ops runbook (production)

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| `503` on writes / chat | `try_acquire_*_rate_slot` RPC error | Check Supabase status; verify migrations `20240526`–`20240532`; inspect `chat_rate_events` / `api_rate_events` growth |
| `429` on API | Legitimate rate limit | Response includes `retryAfter`; user waits or you tune caps in `lib/api-rate-limits.ts` / `lib/chat-limits.ts` |
| `503` on `POST /api/chat` with idempotency key | Idempotency ledger unavailable | Check `chat_idempotent_requests`; migration `20240530_chat_idempotency.sql` |
| Data leak suspicion | Service role used for reads | Grep app for `createSupabaseAdminClient` in `app/`; use anon (public) or `createAuthedDb()` (owned) |
| Cannot correlate errors | Missing request id | Client sends optional `x-request-id`; all API responses echo it; search logs for `request.complete` + `requestId` |

**Log queries (JSON lines on stdout):**

- 5xx by route: filter `event=request.complete` and `status>=500`
- Latency: filter `event=metric.api.latency_ms`, aggregate `value` by `route`
- Chat failures: filter `route=POST /api/chat` and `level=error`

**Scheduled maintenance:** Vercel cron hits `GET /api/cron/purge-rate-events` (see `docs/INFRA.md`), which calls `purge_rate_ledgers()` (~7 day retention). Manual: `select public.purge_rate_ledgers();`
