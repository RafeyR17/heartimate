-- BYOK (bring your own API key) + per-user daily message quota (24h rolling window).

alter table public.users
  add column if not exists byok_provider text,
  add column if not exists byok_key_encrypted text,
  add column if not exists is_byok boolean not null default false,
  add column if not exists daily_msg_count int not null default 0,
  add column if not exists msg_reset_at timestamptz not null default now();

comment on column public.users.byok_provider is 'openrouter | openai | null';
comment on column public.users.byok_key_encrypted is 'AES-GCM encrypted provider API key; never expose to clients';
comment on column public.users.is_byok is 'When true, daily_msg_count quota is skipped';
comment on column public.users.daily_msg_count is 'Free-tier messages in current 24h window';
comment on column public.users.msg_reset_at is 'Start of current 24h quota window';

-- Atomically bump daily count for the authenticated app user.
create or replace function public.increment_message_count(p_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'forbidden';
  end if;

  update public.users
  set daily_msg_count = coalesce(daily_msg_count, 0) + 1
  where id = p_user_id;
end;
$$;

grant execute on function public.increment_message_count(text) to authenticated, service_role;
