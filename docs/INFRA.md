# Infrastructure & performance (Vercel + Supabase)

## Regions (10/10)

Align **Vercel** deployment region with **Supabase** project region (e.g. `us-east-1` / `iad1`).

- Vercel: Project → Settings → Functions → Region
- Supabase: Project Settings → General → Region

Mismatch adds ~50–150ms RTT on every API/RSC data fetch.

## Supabase connection model

- **App code (`@supabase/supabase-js`):** uses the HTTPS PostgREST URL (`NEXT_PUBLIC_SUPABASE_URL`). No Postgres pooler URL required for normal CRUD/RPC.
- **Direct SQL / Prisma / migrations:** use the **transaction pooler** (`*.pooler.supabase.com:6543`) on serverless to avoid connection spikes.
- Optional server override: `SUPABASE_URL` (same REST endpoint; useful if you split read replicas later).

## Rate ledger maintenance (cron)

Migration `20240602_purge_rate_ledgers.sql` exposes one RPC:

```sql
select public.purge_rate_ledgers(); -- default: older than 7 days
```

**Vercel Cron** (`vercel.json`): `GET /api/cron/purge-rate-events` daily at 04:00 UTC.

Production env:

```bash
CRON_SECRET=<random-long-secret>
```

Vercel sends `Authorization: Bearer $CRON_SECRET`. Manual run:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/purge-rate-events
```

## CDN & images

| Asset | Cache |
|-------|--------|
| `/public/images/*` | `Cache-Control: public, max-age=31536000, immutable` (see `next.config.ts`) |
| Supabase `avatars` bucket | Public read; objects served from Supabase CDN. Prefer WebP uploads; set object `cacheControl` on upload if you add long-lived URLs. |
| `next/image` remote | `*.supabase.co` in `remotePatterns` |

## Third parties

| Service | Pattern |
|---------|---------|
| **Clerk** | `ClerkProvider` only on `(app)`, `(auth)`, `/onboarding`, `/sso-callback` — not on `/`, `/explore`, or public character pages. Middleware still validates JWT on protected routes. |
| **PostHog** | Proxied via `/ingest` rewrites; client init deferred (`PostHogDeferred`) until idle or first interaction. Server events use `posthog-node`. |
| **OpenRouter** | Server-only; env + defaults in `lib/llm.ts`. See [LLM.md](./LLM.md). |

## Monitoring

- **Vercel Speed Insights:** `@vercel/speed-insights` in root layout (Web Vitals: LCP, INP, CLS).
- **API latency:** structured logs `event=metric.api.latency_ms` and `event=request.complete` with `x-request-id`.
- **Dashboards:** filter 5xx by `route`; p95 on `metric.api.latency_ms` by route (ingest logs to Datadog/PostHog/Axiom).

Suggested alerts:

- p95 `POST /api/chat` > 8s (stream start + first byte)
- 5xx rate > 1% on write routes
- `cron.purge_failed` in logs
