-- User personas for immersive roleplay identity
create table if not exists public.personas (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.users(id) on delete cascade not null,
  name text not null,
  avatar_url text,
  short_bio text,
  appearance text,
  personality text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chats
  add column if not exists persona_id text references public.personas(id) on delete set null;

create index if not exists idx_personas_user_id on public.personas(user_id);
create index if not exists idx_chats_persona_id on public.chats(persona_id);
