-- Clerk JWT + RLS: defense in depth for API routes using anon key + Clerk token.
-- Configure Clerk JWT template "supabase" and Supabase Third-Party Auth (Clerk).
-- Service role remains for rate-limit/idempotency ledger and user bootstrap only.

-- ---------------------------------------------------------------------------
-- JWT helpers (Clerk `sub` claim = users.clerk_id)
-- ---------------------------------------------------------------------------
create or replace function public.clerk_sub()
returns text
language sql
stable
as $$
  select nullif(trim(coalesce(auth.jwt() ->> 'sub', '')), '');
$$;

comment on function public.clerk_sub()
  is 'Clerk user id from JWT sub claim; null when unauthenticated.';

create or replace function public.current_app_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.clerk_id = public.clerk_sub()
  limit 1;
$$;

comment on function public.current_app_user_id()
  is 'App users.id for the authenticated Clerk subject; null if unknown.';

revoke all on function public.clerk_sub() from public;
grant execute on function public.clerk_sub() to anon, authenticated, service_role;

revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users
  for select
  to authenticated
  using (clerk_id = public.clerk_sub());

drop policy if exists users_update_own on public.users;
create policy users_update_own
  on public.users
  for update
  to authenticated
  using (clerk_id = public.clerk_sub())
  with check (clerk_id = public.clerk_sub());

drop policy if exists users_insert_own on public.users;
create policy users_insert_own
  on public.users
  for insert
  to authenticated
  with check (clerk_id = public.clerk_sub());

-- ---------------------------------------------------------------------------
-- characters (public catalog + owner CRUD)
-- ---------------------------------------------------------------------------
drop policy if exists characters_owner_insert on public.characters;
create policy characters_owner_insert
  on public.characters
  for insert
  to authenticated
  with check (user_id = public.current_app_user_id());

drop policy if exists characters_owner_update on public.characters;
create policy characters_owner_update
  on public.characters
  for update
  to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists characters_owner_delete on public.characters;
create policy characters_owner_delete
  on public.characters
  for delete
  to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists characters_select_readable on public.characters;
create policy characters_select_readable
  on public.characters
  for select
  to authenticated
  using (
    is_public = true
    or user_id = public.current_app_user_id()
  );

-- ---------------------------------------------------------------------------
-- chats
-- ---------------------------------------------------------------------------
drop policy if exists chats_owner_all on public.chats;
create policy chats_owner_all
  on public.chats
  for all
  to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- ---------------------------------------------------------------------------
-- messages (via chat ownership)
-- ---------------------------------------------------------------------------
drop policy if exists messages_via_chat on public.messages;
create policy messages_via_chat
  on public.messages
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.chats c
      where c.id = messages.chat_id
        and c.user_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1
      from public.chats c
      where c.id = messages.chat_id
        and c.user_id = public.current_app_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- chat_memory
-- ---------------------------------------------------------------------------
drop policy if exists chat_memory_via_chat on public.chat_memory;
create policy chat_memory_via_chat
  on public.chat_memory
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.chats c
      where c.id = chat_memory.chat_id
        and c.user_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1
      from public.chats c
      where c.id = chat_memory.chat_id
        and c.user_id = public.current_app_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- personas
-- ---------------------------------------------------------------------------
drop policy if exists personas_owner_all on public.personas;
create policy personas_owner_all
  on public.personas
  for all
  to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- ---------------------------------------------------------------------------
-- character_likes
-- ---------------------------------------------------------------------------
drop policy if exists character_likes_owner_all on public.character_likes;
create policy character_likes_owner_all
  on public.character_likes
  for all
  to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
  on public.reports
  for insert
  to authenticated
  with check (user_id = public.current_app_user_id());

drop policy if exists reports_select_own on public.reports;
create policy reports_select_own
  on public.reports
  for select
  to authenticated
  using (user_id = public.current_app_user_id());

-- ---------------------------------------------------------------------------
-- RPCs: authenticated may call when p_user_id matches JWT user
-- ---------------------------------------------------------------------------
create or replace function public.create_chat_with_greeting(
  p_user_id text,
  p_character_id text,
  p_persona_id text,
  p_title text,
  p_greeting text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat_id text;
  v_greeting text;
  v_caller text;
begin
  v_caller := public.current_app_user_id();
  if v_caller is not null and p_user_id is distinct from v_caller then
    raise exception 'forbidden';
  end if;

  insert into public.chats (
    user_id,
    character_id,
    persona_id,
    title,
    last_message_at
  )
  values (
    p_user_id,
    p_character_id,
    p_persona_id,
    p_title,
    now()
  )
  returning id into v_chat_id;

  v_greeting := nullif(trim(coalesce(p_greeting, '')), '');
  if v_greeting is not null then
    insert into public.messages (chat_id, role, content)
    values (v_chat_id, 'assistant', v_greeting);
  end if;

  update public.characters
  set chat_count = coalesce(chat_count, 0) + 1
  where id = p_character_id;

  return jsonb_build_object('chat_id', v_chat_id);
end;
$$;

create or replace function public.finalize_chat_turn(
  p_chat_id text,
  p_user_id text,
  p_assistant_content text,
  p_new_total_messages integer,
  p_affection_score integer,
  p_relationship_level text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id text;
  v_caller text;
begin
  v_caller := public.current_app_user_id();
  if v_caller is not null and p_user_id is distinct from v_caller then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.chats c
    where c.id = p_chat_id
      and c.user_id = p_user_id
  ) then
    raise exception 'chat_not_found';
  end if;

  insert into public.messages (chat_id, role, content)
  values (p_chat_id, 'assistant', p_assistant_content)
  returning id into v_message_id;

  update public.chats
  set
    last_message_at = now(),
    last_opened_at = now(),
    affection_score = p_affection_score,
    relationship_level = p_relationship_level,
    total_messages = p_new_total_messages
  where id = p_chat_id
    and user_id = p_user_id;

  return v_message_id;
end;
$$;

grant execute on function public.create_chat_with_greeting(text, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.finalize_chat_turn(text, text, text, integer, integer, text)
  to authenticated, service_role;
