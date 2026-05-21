-- Atomically insert assistant reply and update chat counters for POST /api/chat.

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
begin
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

comment on function public.finalize_chat_turn(text, text, text, integer, integer, text)
  is 'Insert assistant message and update chat row in one transaction.';

grant execute on function public.finalize_chat_turn(text, text, text, integer, integer, text)
  to service_role;
