-- Tag chat rate events (message vs regenerate) and enforce separate regenerate cap.

drop function if exists public.try_acquire_chat_rate_slot(text, bigint, timestamptz);

alter table public.chat_rate_events
  add column if not exists kind text not null default 'message'
  check (kind in ('message', 'regenerate'));

create index if not exists chat_rate_events_user_kind_created_idx
  on public.chat_rate_events (user_id, kind, created_at desc);

create or replace function public.try_acquire_chat_rate_slot(
  p_user_id text,
  p_max bigint,
  p_since timestamptz,
  p_is_regenerate boolean default false,
  p_regenerate_max bigint default null,
  p_regenerate_since timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_regen bigint;
begin
  select count(*)::bigint into v_total
  from public.chat_rate_events
  where user_id = p_user_id
    and created_at >= p_since;

  if v_total >= p_max then
    return false;
  end if;

  if p_is_regenerate and p_regenerate_max is not null and p_regenerate_since is not null then
    select count(*)::bigint into v_regen
    from public.chat_rate_events
    where user_id = p_user_id
      and kind = 'regenerate'
      and created_at >= p_regenerate_since;

    if v_regen >= p_regenerate_max then
      return false;
    end if;
  end if;

  insert into public.chat_rate_events (user_id, kind)
  values (
    p_user_id,
    case when p_is_regenerate then 'regenerate' else 'message' end
  );

  return true;
end;
$$;

comment on function public.try_acquire_chat_rate_slot(text, bigint, timestamptz, boolean, bigint, timestamptz)
  is 'Rate-limit every POST /api/chat; optional stricter cap for regenerate (omitUserPersist).';

grant execute on function public.try_acquire_chat_rate_slot(text, bigint, timestamptz, boolean, bigint, timestamptz)
  to service_role;
