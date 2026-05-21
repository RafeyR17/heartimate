# OpenRouter (LLM)

Server-only integration in `lib/llm.ts`. Chat streams via `POST /api/chat`; memory summarization uses the same API with a separate model.

## Environment variables

```bash
OPENROUTER_API_KEY=...

# Models
OPENROUTER_MODEL=deepseek/deepseek-chat          # default for all chats (SFW and NSFW when NSFW model unset)
OPENROUTER_MODEL_NSFW=                           # optional; used only when character.is_nsfw
OPENROUTER_MEMORY_MODEL=deepseek/deepseek-chat   # memory summarization only (non-streaming)

# Generation — SFW fallbacks when *_SFW / *_NSFW unset (optional)
OPENROUTER_MAX_TOKENS=1000
OPENROUTER_TEMPERATURE=0.9
OPENROUTER_PRESENCE_PENALTY=0.6
OPENROUTER_FREQUENCY_PENALTY=0.3

# Per-mode overrides (optional; code defaults apply when unset)
OPENROUTER_MAX_TOKENS_SFW=
OPENROUTER_MAX_TOKENS_NSFW=
OPENROUTER_TEMPERATURE_SFW=
OPENROUTER_TEMPERATURE_NSFW=
OPENROUTER_FREQUENCY_PENALTY_SFW=
OPENROUTER_FREQUENCY_PENALTY_NSFW=
OPENROUTER_PRESENCE_PENALTY_SFW=
OPENROUTER_PRESENCE_PENALTY_NSFW=
```

Unset env → safe defaults in `resolveChatModel()` / `resolveChatGenerationParams()` (same provider slug for everyone if you only set `OPENROUTER_MODEL`). `OPENROUTER_MAX_TOKENS` / `OPENROUTER_TEMPERATURE` / `OPENROUTER_FREQUENCY_PENALTY` apply to **SFW** chats only; NSFW uses `*_NSFW` vars or the NSFW code defaults.

### Beta cost controls

```bash
# 20 chat turns per user per UTC day (default when unset); 0 = unlimited
CHAT_DAILY_MESSAGE_LIMIT=20

# Per-minute burst caps (still apply)
CHAT_API_RATE_LIMIT_MAX=10
CHAT_REGENERATE_RATE_LIMIT_MAX=2

# NSFW: same model as SFW to save money, or set a dedicated slug
OPENROUTER_MODEL=deepseek/deepseek-chat
OPENROUTER_MODEL_NSFW=deepseek/deepseek-chat
OPENROUTER_MAX_TOKENS_NSFW=800
```

NSFW **content** is allowed when `characters.is_nsfw` is true — prompts and moderation in `lib/chat-moderation.ts` expect adult fiction; the daily cap applies to all chats equally.

## Model strategy

| Chat type | Model |
|-----------|--------|
| SFW (`is_nsfw = false`) | `OPENROUTER_MODEL` → `deepseek/deepseek-chat` |
| NSFW (`is_nsfw = true`) | `OPENROUTER_MODEL_NSFW` if set, else `OPENROUTER_MODEL` |
| Memory refresh | `OPENROUTER_MEMORY_MODEL` always |

Product NSFW **rules** (prompt block, character flags) are unchanged — this only picks a model that can follow them in character.

### Picking `OPENROUTER_MODEL_NSFW`

1. Open [OpenRouter Models](https://openrouter.ai/models) and filter/compare candidates for **uncensored / adult roleplay** (read each model’s provider card and moderation notes).
2. In the OpenRouter playground, run a short NSFW character system prompt + user turn; confirm the model stays in character without refusals or policy lectures.
3. Set the exact slug in env, e.g. `OPENROUTER_MODEL_NSFW=provider/model-id`.
4. Keep `OPENROUTER_MODEL` on a stricter or cheaper default for SFW traffic.

Do **not** lower `OPENROUTER_TEMPERATURE` (or SFW temperature defaults) to “make safer” — that degrades intimate/variable NSFW scenes. Safety is enforced in app prompts and `is_nsfw`, not by starving sampling.

## Generation defaults (code)

When per-mode env vars are unset:

| Param | SFW | NSFW |
|-------|-----|------|
| `max_tokens` | 1000 | 1350 |
| `temperature` | 0.85 | 0.92 |
| `presence_penalty` | 0.6 | 0.6 |
| `frequency_penalty` | 0.3 | 0.2 |

Suggested production tuning ranges: SFW `max_tokens` 800–1000; NSFW 1200–1500; NSFW `temperature` 0.9–0.95; NSFW `frequency_penalty` ~0.2 for long action-heavy replies.

## Special replies

No random “special moment” prompts. `shouldSpecialReply()` in `lib/affection.ts` triggers only on peak relationship level-up (`intimate`, `devoted`, `obsessed`) or first crossing into intimate / devoted.

## Regenerate contract

`omitUserPersist: true` replaces the last user message in history (no new DB row). Payload shape is built via `buildOpenRouterChatRequestBody()` — see `lib/chat-llm-contract.test.ts` and `app/api/chat/route.contract.test.ts`.

## Prompt versioning

`PROMPT_VERSION` in `lib/prompt-version.ts` — bump when changing `buildSystemPrompt` / absolute rules. Logged on each chat as `promptVersion`; golden evals in `tests/llm-eval/golden/` assert against it.

## Illegal content moderation (pre-OpenRouter)

`lib/chat-moderation.ts` runs **before** the main chat completion on every `POST /api/chat` turn.

| Layer | Behavior |
|-------|----------|
| Heuristics | Always on — high-confidence minors / jailbreak patterns |
| OpenRouter classifier | On unless `CHAT_MODERATION_DISABLED=true` |
| NSFW chats | Classifier prompt explicitly **allows** consensual adult explicit fiction |
| Fail closed (first failures) | API/parse errors → in-character refusal (not “I am an AI”) |
| Circuit breaker | After `CHAT_MODERATION_CIRCUIT_FAILURES` (default 3) failures, classifier bypassed for `CHAT_MODERATION_CIRCUIT_COOLDOWN_MS` (default 60s) — heuristics only, chat stays up |
| Classifier | `response_format: json_object` for structured `{ illegal, category }` |

Env:

```bash
CHAT_MODERATION_DISABLED=true          # local only: heuristics only, skip classifier call
OPENROUTER_MODERATION_MODEL=           # optional; defaults to OPENROUTER_MODEL default slug
CHAT_MODERATION_CIRCUIT_FAILURES=3
CHAT_MODERATION_CIRCUIT_COOLDOWN_MS=60000
```

Refusal text is streamed like a normal assistant reply and persisted via `finalize_chat_turn`.

## Model fallback

```bash
OPENROUTER_MODEL_FALLBACK=backup/slug,other/slug   # tried in order on 5xx/429
```

`streamChat()` retries the next slug automatically; logs `fallbackUsed` + `primaryModel` on completion.

## LLM telemetry

Every completed chat stream emits structured logs via `emitLlmMetrics()`:

- `llm.stream_complete` — `model`, `latencyMs`, `promptTokens`, `completionTokens`, `totalTokens`, optional `fallbackUsed`
- `metric.llm.latency_ms` / `metric.llm.tokens` — for dashboards

Memory refresh: `memory.refresh` span with one automatic retry on failure.

## Quality evals

Scripted scenarios: `tests/llm-eval/scenarios.ts` (12 cases). **Golden files** in `tests/llm-eval/golden/*.json` assert prompt/refusal/assistant output shape. Run after prompt or model changes:

```bash
npm run test:llm-eval          # static + golden — CI
npm run test:llm-eval:live      # needs OPENROUTER_API_KEY (assistant golden checks)
```

See `tests/llm-eval/README.md` for the manual checklist table.

## Incident runbook (OpenRouter)

1. **Stop new LLM traffic:** Set `CHAT_DISABLED=true` in hosting env and redeploy. `POST /api/chat` returns **503** until cleared (see `docs/SECURITY_INCIDENT.md`).
2. **Provider status:** Check [OpenRouter status](https://status.openrouter.ai/) and the model card for `OPENROUTER_MODEL` / `OPENROUTER_MODEL_NSFW` (latency, moderation, deprecations).
3. **Model fallback:** Point `OPENROUTER_MODEL` and/or `OPENROUTER_MODEL_NSFW` to the last known-good slug; redeploy. SFW and NSFW can be rolled back independently.
4. **Key rotation:** If `OPENROUTER_API_KEY` leaked, revoke in OpenRouter dashboard, issue a new key, update env, redeploy.
5. **Moderation-only outage:** Circuit opens automatically after repeated classifier failures (heuristics-only window). For immediate relief: `CHAT_MODERATION_DISABLED=true` (heuristics only).
6. **Model outage:** Set `OPENROUTER_MODEL_FALLBACK` to last-known-good slugs or swap primary env vars.

## Implementation notes

- `streamChat()` buffers SSE lines so chunks split mid-line do not break JSON parse.
- `mergeChatAbortSignal(req.signal)` combines client disconnect with a 120s OpenRouter timeout.
- History trimming remains in `lib/llm-context.ts`; system prompt caps in `lib/prompt-budget.ts`.
- Moderation span: `moderation` → `moderation.refused` or `llm.stream_start`.
