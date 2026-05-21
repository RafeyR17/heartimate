# Security incident runbook

One-page guide for Heartimate production incidents: key leaks, auth compromise, cost spikes, and storage abuse.

**On-call rotation:** _fill in team contacts_

| Role | Contact |
|------|---------|
| Primary engineer | |
| Backup | |
| Product / user comms | |

**Status pages:** [Supabase](https://status.supabase.com/) · [Clerk](https://status.clerk.com/) · [OpenRouter](https://status.openrouter.ai/) · [Vercel](https://www.vercel-status.com/)

---

## Severity 1 — `SUPABASE_SERVICE_ROLE_KEY` leaked

Service role bypasses RLS and has full database access.

1. **Rotate immediately:** Supabase Dashboard → Project Settings → API → regenerate **service role** key.
2. **Update secrets:** Vercel (or host) env → `SUPABASE_SERVICE_ROLE_KEY` → redeploy all instances.
3. **Review logs:** Supabase Dashboard → Logs (last 24h) for unusual `select *`, bulk deletes, or new admin RPC volume.
4. **Assume breach:** Full read/write was possible. If PII or private chats were exposed, prepare user notification per legal/policy.
5. **Post-incident:** Run `npm run audit:service-role` on codebase; confirm no client-side or logged exposure of the key.

---

## Severity 2 — Clerk compromise / mass account takeover

1. **Clerk Dashboard:** Sign out all users / revoke active sessions if takeover is active.
2. **Rotate secrets:** Regenerate Clerk **secret key** and any exposed webhook/signing keys; update Vercel env.
3. **Pause chat:** Set `CHAT_DISABLED=true` in Vercel env and redeploy. `POST /api/chat` returns **503** until cleared.
4. **Review:** Clerk audit log for suspicious OAuth apps, JWT template changes, or user creation spikes.
5. **Supabase:** If JWT template was tampered, verify Third-Party Auth issuer still matches Clerk.

---

## Severity 3 — LLM cost spike (OpenRouter)

1. **Check PostHog** for `chat_message_sent` spikes by user / time window.
2. **Tighten limits:** Lower `CHAT_API_RATE_LIMIT_MAX` (and optionally `CHAT_REGENERATE_RATE_LIMIT_MAX`) in Vercel env; redeploy.
3. **Kill switch:** Set `CHAT_DISABLED=true` to stop new LLM calls while investigating.
4. **OpenRouter:** Dashboard → usage, rotate API key if abuse is external.
5. **Supabase:** Inspect `chat_rate_events` for single-user floods.

---

## Severity 4 — Storage abuse (avatars bucket)

1. **Rate limits:** Avatar uploads capped via `avatar_upload` in `api_rate_events` (20/hour). Lower in `lib/api-rate-limits.ts` if needed.
2. **Temporary block:** Disable upload branches (profile/character/persona PATCH/POST) via feature flag or deploy revert.
3. **Audit bucket:** Supabase Storage → `avatars` → list recent objects; delete junk prefixes / offending user folders.
4. **Review:** `npm audit` and upload validation (`lib/upload.ts` magic-byte + sharp re-encode).

---

## Environment flags (reference)

| Variable | Effect |
|----------|--------|
| `CHAT_DISABLED=true` | `POST /api/chat` → 503 (maintenance) |
| `CHAT_API_RATE_LIMIT_MAX` | Override default 30/min chat cap |
| `CHAT_DAILY_MESSAGE_LIMIT` | Daily chat turns per user (UTC day). Default **20** when unset; `0` = unlimited |
| `CHAT_REGENERATE_RATE_LIMIT_MAX` | Override default 5/min regenerate cap |
| `SUPABASE_RLS_BYPASS=true` | **Non-production only** — dev fallback; never in prod |

---

## Communication template (user-facing)

> We detected a security issue affecting Heartimate. We have rotated affected credentials and [paused chat / taken X action]. We are reviewing logs for unauthorized access. We will update you within [timeframe]. Contact: [email].

---

## After any severity 1–2

- [ ] Keys rotated and old keys invalidated  
- [ ] Deploy completed with new env  
- [ ] Logs reviewed and timeline documented  
- [ ] IDOR/security tests still pass (`npm run test:security`)  
- [ ] Post-mortem scheduled within 5 business days  
