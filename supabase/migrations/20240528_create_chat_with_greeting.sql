-- Atomically create chat, optional greeting message, and bump character chat_count.

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
begin
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

  update public.chacters
  set chat_count = coalesce(chat_count, 0) + 1
  where id = p_character_id;

  return jsonb_build_object('chat_id', v_chat_id);
end;
$$;

comment on function public.create_chat_with_greeting(text, text, text, text, text)
  is 'Create chat row, seed greeting message, increment character chat_count in one transaction.';

grant execute on function public.create_chat_with_greeting(text, text, text, text, text)
  to service_role;
