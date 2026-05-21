-- Single-round-trip RPCs for app shell + chat turn (serverless latency).

-- Sidebar: streak + recent chats in one call
create or replace function public.get_sidebar_context(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text;
  v_user record;
  v_chats jsonb;
begin
  v_caller := public.current_app_user_id();
  if v_caller is not null and p_user_id is distinct from v_caller then
    raise exception 'forbidden';
  end if;

  select u.display_name, u.avatar_url, u.streak_count
  into v_user
  from public.users u
  where u.id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'character', jsonb_build_object(
          'name', ch.name,
          'avatar_url', ch.avatar_url
        ),
        'persona', case
          when p.id is not null then jsonb_build_object('name', p.name)
          else null
        end
      )
      order by c.last_message_at desc nulls last
    ),
    '[]'::jsonb
  )
  into v_chats
  from (
    select c.id, c.persona_id, c.character_id, c.last_message_at
    from public.chats c
    where c.user_id = p_user_id
    order by c.last_message_at desc nulls last
    limit 8
  ) c
  join public.characters ch on ch.id = c.character_id
  left join public.personas p on p.id = c.persona_id;

  return jsonb_build_object(
    'ok', true,
    'display_name', v_user.display_name,
    'avatar_url', v_user.avatar_url,
    'streak_count', coalesce(v_user.streak_count, 0),
    'chats', v_chats
  );
end;
$$;

grant execute on function public.get_sidebar_context(text) to authenticated, service_role;

-- Chat turn: chat + character + persona + messages + memory in one call
create or replace function public.get_chat_turn_context(
  p_chat_id text,
  p_user_id text,
  p_message_limit integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text;
  v_chat record;
  v_character jsonb;
  v_persona jsonb;
  v_messages jsonb;
  v_memory text;
begin
  v_caller := public.current_app_user_id();
  if v_caller is not null and p_user_id is distinct from v_caller then
    raise exception 'forbidden';
  end if;

  select
    c.id,
    c.user_id,
    c.persona_id,
    c.affection_score,
    c.relationship_level,
    c.total_messages
  into v_chat
  from public.chats c
  where c.id = p_chat_id
    and c.user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'chat_not_found');
  end if;

  select jsonb_build_object(
    'id', ch.id,
    'name', ch.name,
    'personality', ch.personality,
    'scenario', ch.scenario,
    'greeting', ch.greeting,
    'example_dialogs', ch.example_dialogs,
    'tags', coalesce(ch.tags, array[]::text[]),
    'is_nsfw', ch.is_nsfw
  )
  into v_character
  from public.characters ch
  where ch.id = (select character_id from public.chats where id = p_chat_id);

  if v_chat.persona_id is not null then
    select jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'short_bio', p.short_bio,
      'appearance', p.appearance,
      'personality', p.personality
    )
    into v_persona
    from public.personas p
    where p.id = v_chat.persona_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('role', m.role, 'content', m.content)
      order by m.created_at asc
    ),
    '[]'::jsonb
  )
  into v_messages
  from (
    select m.role, m.content, m.created_at
    from public.messages m
    where m.chat_id = p_chat_id
    order by m.created_at asc
    limit greatest(1, least(p_message_limit, 100))
  ) m;

  select cm.summary into v_memory
  from public.chat_memory cm
  where cm.chat_id = p_chat_id;

  return jsonb_build_object(
    'ok', true,
    'chat', jsonb_build_object(
      'id', v_chat.id,
      'user_id', v_chat.user_id,
      'persona_id', v_chat.persona_id,
      'affection_score', v_chat.affection_score,
      'relationship_level', v_chat.relationship_level,
      'total_messages', v_chat.total_messages
    ),
    'character', v_character,
    'persona', v_persona,
    'messages', v_messages,
    'memory_summary', v_memory
  );
end;
$$;

grant execute on function public.get_chat_turn_context(text, text, integer)
  to authenticated, service_role;
