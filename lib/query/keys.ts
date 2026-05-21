/** TanStack Query key factories — keep stable and hierarchical for invalidation. */

export const queryKeys = {
  chat: {
    all: ['chat'] as const,
    messages: (chatId: string) => [...queryKeys.chat.all, 'messages', chatId] as const,
  },
  profile: {
    all: ['profile'] as const,
    snapshot: () => [...queryKeys.profile.all, 'snapshot'] as const,
  },
} as const
