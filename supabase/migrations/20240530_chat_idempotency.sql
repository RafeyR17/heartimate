-- Dedupe flaky mobile retries for POST /api/chat via Idempotency-Key header.

create table if not exists public.chat_idempotent_requests (
  user_id text not null references public.users(id) on delete cascade,
  idempotency_key text not null,
  chat_id text not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  response_body text,
  response_headers jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

create index if not exists chat_idempotent_requests_created_idx
  on public.chat_idempotent_requests (created_at desc);

alter table public.chat_idempotent_requests enable row level security;

create or replace function public.claim_chat_idempotency(
  p_user_id text,
  p_idempotency_key text,
  p_chat_id text,
  p_stale_after_seconds integer default 120
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.chat_idempotent_requests%rowtype;
begin
  select * into v_row
  from public.chat_idempotent_requests
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_row.status = 'completed' and v_row.response_body is not null then
      return 'replay';
    end if;
    if v_row.status = 'processing'
      and v_row.created_at > now() - make_interval(secs => p_stale_after_seconds) then
      return 'in_progress';
    end if;
    delete from public.chat_idempotent_requests
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;
  end if;

  insert into public.chat_idempotent_requests (user_id, idempotency_key, chat_id, status)
  values (p_user_id, p_idempotency_key, p_chat_id, 'processing');

  return 'claimed';
end;
$$;

create or replace function public.complete_chat_idempotency(
  p_user_id text,
  p_idempotency_key text,
  p_response_body text,
  p_response_headers jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_idempotent_requests
  set
    status = 'completed',
    response_body = p_response_body,
    response_headers = p_response_headers
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;
end;
$$;

create or replace function public.fail_chat_idempotency(
  p_user_id text,
  p_idempotency_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_idempotent_requests
  set status = 'failed'
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;
end;
$$;

grant execute on function public.claim_chat_idempotency(text, text, text, integer)
  to service_role;
grant execute on function public.complete_chat_idempotency(text, text, text, jsonb)
  to service_role;
grant execute on function public.fail_chat_idempotency(text, text)
  to service_role;
