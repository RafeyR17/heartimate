-- Denormalized last message preview on chats (profile sidebar, avoid full messages scan).

alter table public.chats
  add column if not exists last_message_preview text,
  add column if not exists last_message_role text;

comment on column public.chats.last_message_preview is 'Truncated latest message content for list UIs.';
comment on column public.chats.last_message_role is 'Role of the latest message (user|assistant|system).';

-- Backfill from latest message per chat
update public.chats c
set
  last_message_role = sub.role,
  last_message_preview = left(sub.content, 200)
from (
  select distinct on (chat_id)
    chat_id,
    role,
    content
  from public.messages
  order by chat_id, created_at desc
) sub
where c.id = sub.chat_id;

create or replace function public.sync_chat_message_stats(p_chat_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_last timestamptz;
  v_role text;
  v_preview text;
begin
  select count(*)::int, max(created_at)
  into v_count, v_last
  from public.messages
  where chat_id = p_chat_id;

  select m.role, left(m.content, 200)
  into v_role, v_preview
  from public.messages m
  where m.chat_id = p_chat_id
  order by m.created_at desc
  limit 1;

  update public.chats
  set
    total_messages = coalesce(v_count, 0),
    last_message_at = coalesce(v_last, now()),
    last_message_role = v_role,
    last_message_preview = v_preview
  where id = p_chat_id;
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
    total_messages = p_new_total_messages,
    last_message_role = 'assistant',
    last_message_preview = left(p_assistant_content, 200)
  where id = p_chat_id
    and user_id = p_user_id;

  return v_message_id;
end;
$$;
