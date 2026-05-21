-- Deduplicate chats before adding constraint
-- Keep the most recently active chat for each (user_id, character_id)
DELETE FROM public.chats
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER(PARTITION BY user_id, character_id ORDER BY last_message_at DESC) as rn
    FROM public.chats
  ) t
  WHERE t.rn > 1
);

ALTER TABLE public.chats
  ADD CONSTRAINT chats_user_character_unique UNIQUE (user_id, character_id);
