-- Append-only ledger for /api/chat rate limiting.
-- Counts every chat API call (including regenerate / edit-resend), not persisted user rows.

create table if not exists public.chat_rate_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists chat_rate_events_user_created_idx
  on public.chat_rate_events (user_id, created_at desc);

alter table public.chat_rate_events enable row level security;

create or replace function public.try_acquire_chat_rate_slot(
  p_user_id text,
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
  from public.chat_rate_events
  where user_id = p_user_id
    and created_at >= p_since;

  if v_count >= p_max then
    return false;
  end if;

  insert into public.chat_rate_events (user_id) values (p_user_id);
  return true;
end;
$$;

comment on function public.try_acquire_chat_rate_slot(text, bigint, timestamptz)
  is 'Atomically check chat API rate limit and record one request; used by POST /api/chat.';

grant execute on function public.try_acquire_chat_rate_slot(text, bigint, timestamptz)
  to service_role;
