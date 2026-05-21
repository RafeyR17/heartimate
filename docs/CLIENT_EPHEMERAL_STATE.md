# Client ephemeral state

What survives a refresh, navigation, or new device — and what does not.

**Registry:** all browser keys and helpers live in [`lib/client-storage.ts`](../lib/client-storage.ts).

| Kind | Meaning |
|------|---------|
| **preference** | Device UX toggle; survives refresh; not authoritative |
| **cache** | Convenience data; safe to lose |
| **one_shot** | Write once, read/consume once |
| **session_ui** | Per-tab UI (scroll, animations) |

## Storage map

| Key / helper | Kind | API |
|--------------|------|-----|
| `heartimate-voice-enabled` | preference | `getVoiceEnabled` / `setVoiceEnabled` |
| `heartimate-auto-read` | preference | `getAutoRead` / `setAutoRead` |
| `heartimate-recent-personas` | cache | `getRecentPersonaIds` / `recordRecentPersona` |
| `heartimate.streak.milestones` | cache | `getCelebratedStreakMilestones` / `markStreakMilestoneCelebrated` |
| `heartimate_new_user` | one_shot | `setNewUserHint` / `consumeNewUserHint` |
| `heartimate_fork` (session) | one_shot | `setForkPayload` / `consumeForkPayload` |
| `heartimate_app_shell_entered` (session) | session_ui | `claimAppShellEnterAnimation` |
| `chat-scroll-{chatId}` (session) | session_ui | `readChatScrollTop` / `writeChatScrollTop` |

## Chat (`/chat/[chatId]`)

| State | Persisted? | Notes |
|-------|------------|--------|
| Messages, affection | Yes (DB) | RSC + `reconcileWithServer()` — see `CHAT_MESSAGE_STATE.md` |
| `myReaction` | **No** | Session UI; add DB column or drop picker |
| `regenerateCount` | **No** | Cosmetic counter |
| Voice / auto-read | **preference** | `client-storage` when TTS is wired |

## Profile (`/profile`)

Server lists via RSC; after mutations call `useProfileInvalidate()` (`lib/query/use-profile-invalidate.ts`) — invalidates TanStack `profile` keys and `router.refresh()`. Props resync via `profileSnapshotKey` in `lib/profile-server-sync.ts`.

## Client data (TanStack Query v5)

- **Provider:** `components/QueryProvider.tsx` in root `app/layout.tsx`.
- **Keys:** `lib/query/keys.ts`.
- **Chat messages:** `useChatMessages` stores the list in `queryKeys.chat.messages(chatId)`; streaming/send still patch cache via `setMessages` / `setQueryData`.
- **Profile:** `useProfileInvalidate()` after deletes/patches; optimistic UI unchanged.

## Toasts

Single implementation: `components/ToastProvider.tsx` + `useToast()` (`success`, `error`, `info`, `warning`). Legacy `components/Toast.tsx` removed.
