-- Reports table for character moderation
create table if not exists public.reports (
  id text primary key default gen_random_uuid()::text,
  character_id text references public.characters(id) on delete set null,
  user_id text references public.users(id) on delete set null,
  reason text not null,
  details text,
  created_at timestamptz default now()
);

create index if not exists reports_character_id_idx on public.reports (character_id);
create index if not exists reports_user_id_idx on public.reports (user_id);

-- Fork attribution on characters (optional columns)
alter table public.characters
  add column if not exists forked_from_id text references public.characters(id) on delete set null;

alter table public.characters
  add column if not exists forked_from_name text;
