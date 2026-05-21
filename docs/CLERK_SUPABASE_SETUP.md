# Clerk + Supabase auth wiring

One-time setup so `createAuthedDb()` gets a JWT Supabase accepts and RLS policies apply.

## Quick start

```bash
npm run auth:wire      # Clerk JWT template + Supabase TPA instructions
npm run auth:verify    # JWT + RLS IDOR check against live project
INTEGRATION_TEST=1 npm run test:integration
```

## 1. Clerk

### Block fake / disposable sign-up emails

1. [Clerk Dashboard](https://dashboard.clerk.com) → **Attack protection** (or **Restrictions**) → enable **Block disposable email addresses** (checks 160k+ temp-mail domains at sign-up).
2. Optional: **Allowlist** only if you run a private beta (restrict who can register).
3. App-side: `lib/signup-email.ts` also blocks common disposable domains on `/signup` before `signUp.create()`.

Sign-up already requires **email verification** (6-digit code). Disposable blocklists stop most temp inboxes that never receive mail; Clerk’s setting is the strongest layer.

**Recommended:** [Clerk → Connect with Supabase](https://dashboard.clerk.com/setup/supabase)

**Also:** `npm run auth:wire` ensures JWT template `supabase` with `aud` + `role: authenticated`.

Instance domain: `whole-fly-20.clerk.accounts.dev`

## 2. Supabase third-party auth (required)

Without this, queries return `PGRST301`.

1. [Third-Party Auth](https://supabase.com/dashboard/project/honzonljbkehnubekvgc/auth/third-party)
2. Add **Clerk** → domain `whole-fly-20.clerk.accounts.dev`

Or: `SUPABASE_ACCESS_TOKEN=... npm run auth:wire`

## 3. Migrations

Apply `supabase/migrations/` through `20240533_*` (`supabase db push` or SQL editor).

**Required for message delete/edit IDOR + API routes:** `20240533_message_ops_atomic.sql`  
(`delete_owned_message`, `patch_user_message`, `reset_chat_messages`)

Verify: `npm run auth:verify` checks `clerk_sub()` and `delete_owned_message`.

## 4. Production env

- `SUPABASE_RLS_BYPASS` **unset**
- Service role + Clerk secret: Vercel server-only

## 5. Staging smoke (~30 min)

Use **two browser profiles** (or normal + incognito) with different accounts.

| Step | Pass? |
|------|-------|
| Sign up / log in | |
| Onboarding completes | |
| Create character + upload avatar | |
| Start chat, send message, regenerate | |
| Profile edit saves | |
| Browser console: no CSP errors | |
| User A cannot open user B's chat URL | |

Automated IDOR proof (after step 2 below):

```bash
npm run auth:verify      # JWT + DB-level RLS
npm run auth:prove-idor  # GET/DELETE/POST API routes with real JWTs
```
