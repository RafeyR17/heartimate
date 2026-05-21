-- Generic write-endpoint rate limiting (reports, characters, personas, chats, etc.).
-- POST /api/chat keeps its own chat_rate_events ledger.

create table if not exists public.api_rate_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_rate_events_user_action_created_idx
  on public.api_rate_events (user_id, action, created_at desc);

alter table public.api_rate_events enable row level security;

create or replace function public.try_acquire_api_rate_slot(
  p_user_id text,
  p_action text,
  p_max bigint,
  p_since timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  select count(*)::bigint into v_count
  from public.api_rate_events
  where user_id = p_user_id
    and action = p_action
    and created_at >= p_since;

  if v_count >= p_max then
    return false;
  end if;

  insert into public.api_rate_events (user_id, action)
  values (p_user_id, p_action);

  return true;
end;
$$;

comment on function public.try_acquire_api_rate_slot(text, text, bigint, timestamptz)
  is 'Per-action rate limit for non-chat write API routes.';

grant execute on function public.try_acquire_api_rate_slot(text, text, bigint, timestamptz)
  to service_role;

create or replace function public.purge_api_rate_events(p_older_than interval default interval '7 days')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  delete from public.api_rate_events
  where created_at < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.purge_api_rate_events(interval) to service_role;
