-- Heartimate base schema (users, characters, chats, messages, likes, memory).
-- Later migrations add personas, reports, retention columns, RLS, triggers, RPCs.
-- App writes use the Supabase service role (Clerk auth); see 20240525_rls_and_chat_limits.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  clerk_id text not null unique,
  display_name text not null default 'User',
  kink_prefs text[] not null default '{}',
  avatar_url text,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_clerk_id on public.users (clerk_id);

-- ---------------------------------------------------------------------------
-- characters
-- ---------------------------------------------------------------------------
create table if not exists public.characters (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users (id) on delete cascade,
  name text not null,
  avatar_url text,
  description text,
  personality text not null,
  scenario text,
  greeting text not null,
  example_dialogs text,
  tags text[] not null default '{}',
  is_nsfw boolean not null default false,
  is_public boolean not null default false,
  likes_count int not null default 0,
  chat_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_characters_user_id on public.characters (user_id);
create index if not exists idx_characters_public_likes on public.characters (is_public, likes_count desc);

-- ---------------------------------------------------------------------------
-- character_likes
-- ---------------------------------------------------------------------------
create table if not exists public.character_likes (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users (id) on delete cascade,
  character_id text not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, character_id)
);

create index if not exists idx_character_likes_user on public.character_likes (user_id);
create index if not exists idx_character_likes_character on public.character_likes (character_id);

-- ---------------------------------------------------------------------------
-- chats
-- ---------------------------------------------------------------------------
create table if not exists public.chats (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users (id) on delete cascade,
  character_id text not null references public.characters (id) on delete cascade,
  title text,
  last_message_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chats_user_id on public.chats (user_id);
create index if not exists idx_chats_user_character on public.chats (user_id, character_id);
create index if not exists idx_chats_last_message_at on public.chats (user_id, last_message_at desc);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  chat_id text not null references public.chats (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_chat_id_created on public.messages (chat_id, created_at);

-- ---------------------------------------------------------------------------
-- chat_memory (rolling LLM summary per chat)
-- ---------------------------------------------------------------------------
create table if not exists public.chat_memory (
  chat_id text primary key references public.chats (id) on delete cascade,
  summary text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- storage: public avatars bucket (uploads via service role in API routes)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
