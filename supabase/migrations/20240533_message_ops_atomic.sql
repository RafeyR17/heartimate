-- Atomic message edit/delete/clear + sync chats.total_messages / last_message_at.

create or replace function public.sync_chat_message_stats(p_chat_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_last timestamptz;
begin
  select count(*)::int, max(created_at)
  into v_count, v_last
  from public.messages
  where chat_id = p_chat_id;

  update public.chats
  set
    total_messages = coalesce(v_count, 0),
    last_message_at = coalesce(v_last, now())
  where id = p_chat_id;
end;
$$;

create or replace function public.patch_user_message(
  p_message_id text,
  p_user_id text,
  p_content text,
  p_truncate_after boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text;
  v_chat_id text;
  v_role text;
  v_anchor timestamptz;
  v_row public.messages%rowtype;
begin
  v_caller := public.current_app_user_id();
  if v_caller is not null and p_user_id is distinct from v_caller then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select m.chat_id, m.role, m.created_at
  into v_chat_id, v_role, v_anchor
  from public.messages m
  inner join public.chats c on c.id = m.chat_id
  where m.id = p_message_id
    and c.user_id = p_user_id;

  if v_chat_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_role <> 'user' then
    return jsonb_build_object('ok', false, 'error', 'not_user_message');
  end if;

  if p_truncate_after then
    delete from public.messages
    where chat_id = v_chat_id
      and created_at > v_anchor;
  end if;

  update public.messages
  set content = p_content
  where id = p_message_id
  returning * into v_row;

  perform public.sync_chat_message_stats(v_chat_id);

  return jsonb_build_object(
    'ok',
    true,
    'message',
    jsonb_build_object(
      'id',
      v_row.id,
      'role',
      v_row.role,
      'content',
      v_row.content,
      'created_at',
      v_row.created_at
    )
  );
end;
$$;

create or replace function public.delete_owned_message(
  p_message_id text,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text;
  v_chat_id text;
begin
  v_caller := public.current_app_user_id();
  if v_caller is not null and p_user_id is distinct from v_caller then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select m.chat_id into v_chat_id
  from public.messages m
  inner join public.chats c on c.id = m.chat_id
  where m.id = p_message_id
    and c.user_id = p_user_id;

  if v_chat_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.messages where id = p_message_id;

  perform public.sync_chat_message_stats(v_chat_id);

  return jsonb_build_object('ok', true, 'deleted', true);
end;
$$;

create or replace function public.reset_chat_messages(
  p_chat_id text,
  p_user_id text,
  p_greeting text default null,
  p_empty_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text;
  v_greeting text;
  v_msg public.messages%rowtype;
begin
  v_caller := public.current_app_user_id();
  if v_caller is not null and p_user_id is distinct from v_caller then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if not exists (
    select 1 from public.chats c
    where c.id = p_chat_id and c.user_id = p_user_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.chat_memory where chat_id = p_chat_id;
  delete from public.messages where chat_id = p_chat_id;

  if p_empty_only then
    perform public.sync_chat_message_stats(p_chat_id);
    return jsonb_build_object('ok', true, 'empty', true, 'greeting', null);
  end if;

  v_greeting := nullif(trim(coalesce(p_greeting, '')), '');
  if v_greeting is not null then
    insert into public.messages (chat_id, role, content)
    values (p_chat_id, 'assistant', v_greeting)
    returning * into v_msg;
  end if;

  perform public.sync_chat_message_stats(p_chat_id);

  return jsonb_build_object(
    'ok',
    true,
    'empty',
    false,
    'greeting',
    case
      when v_msg.id is not null then
        jsonb_build_object(
          'id',
          v_msg.id,
          'role',
          v_msg.role,
          'content',
          v_msg.content,
          'created_at',
          v_msg.created_at
        )
      else
        null
    end
  );
end;
$$;

grant execute on function public.sync_chat_message_stats(text) to service_role;
grant execute on function public.patch_user_message(text, text, text, boolean)
  to authenticated, service_role;
grant execute on function public.delete_owned_message(text, text)
  to authenticated, service_role;
grant execute on function public.reset_chat_messages(text, text, text, boolean)
  to authenticated, service_role;
