  -- Chat image messages (Pollinations URLs, assistant role).

  alter table public.messages
    add column if not exists message_type text not null default 'text',
    add column if not exists image_url text,
    add column if not exists image_prompt text;

  alter table public.messages
    drop constraint if exists messages_message_type_check;

  alter table public.messages
    add constraint messages_message_type_check
    check (message_type in ('text', 'image', 'system'));

  comment on column public.messages.message_type is 'text | image | system';
  comment on column public.messages.image_url is 'Pollinations or storage URL when message_type=image';
  comment on column public.messages.image_prompt is 'Prompt used to generate image_url';

  create or replace function public.insert_chat_image_message(
    p_chat_id text,
    p_user_id text,
    p_image_url text,
    p_image_prompt text,
    p_content text default '*sends you a picture*'
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

    insert into public.messages (
      chat_id,
      role,
      content,
      message_type,
      image_url,
      image_prompt
    )
    values (
      p_chat_id,
      'assistant',
      coalesce(nullif(trim(p_content), ''), '*sends you a picture*'),
      'image',
      p_image_url,
      p_image_prompt
    )
    returning id into v_message_id;

    perform public.sync_chat_message_stats(p_chat_id);

    update public.chats
    set last_opened_at = now()
    where id = p_chat_id;

    return v_message_id;
  end;
  $$;

  revoke all on function public.insert_chat_image_message(text, text, text, text, text) from public;
  grant execute on function public.insert_chat_image_message(text, text, text, text, text) to authenticated;
