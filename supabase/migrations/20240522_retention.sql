-- Retention & addiction: streaks, affection

alter table public.users
  add column if not exists streak_count int default 0,
  add column if not exists last_streak_date date,
  add column if not exists longest_streak int default 0;

alter table public.chats
  add column if not exists affection_score int default 0,
  add column if not exists relationship_level text default 'stranger',
  add column if not exists total_messages int default 0,
  add column if not exists last_opened_at timestamptz default now();

-- Optional RPCs (can be called via supabase.rpc from server)
create or replace function public.increment_chat_affection(p_chat_id text, p_amount int)
returns void
language plpgsql
as $$
begin
  update public.chats
  set affection_score = coalesce(affection_score, 0) + p_amount
  where id = p_chat_id;
end;
$$;

create or replace function public.increment_chat_message_count(p_chat_id text)
returns void
language plpgsql
as $$
begin
  update public.chats
  set total_messages = coalesce(total_messages, 0) + 1
  where id = p_chat_id;
end;
$$;
