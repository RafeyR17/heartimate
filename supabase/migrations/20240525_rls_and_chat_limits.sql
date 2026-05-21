-- Defense in depth: block direct anon/authenticated PostgREST access except public character catalog.
-- Server routes use the service role (bypasses RLS) and must enforce authorization in application code.

alter table if exists public.users enable row level security;
alter table if exists public.characters enable row level security;
alter table if exists public.character_likes enable row level security;
alter table if exists public.chats enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.chat_memory enable row level security;
alter table if exists public.personas enable row level security;
alter table if exists public.reports enable row level security;

drop policy if exists characters_public_select on public.characters;
create policy characters_public_select
  on public.characters
  for select
  to anon, authenticated
  using (is_public = true);

-- Rate limiting helper for /api/chat (counts user-authored messages in a time window).
create or replace function public.count_user_messages_since(
  p_user_id text,
  p_since timestamptz
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.messages m
  inner join public.chats c on c.id = m.chat_id
  where c.user_id = p_user_id
    and m.role = 'user'
    and m.created_at >= p_since;
$$;

comment on function public.count_user_messages_since(text, timestamptz)
  is 'Count user messages across all chats since p_since; used for chat API rate limiting.';

grant execute on function public.count_user_messages_since(text, timestamptz)
  to anon, authenticated, service_role;
