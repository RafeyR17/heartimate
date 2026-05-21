-- Database hardening: constraints, indexes, grant cleanup, storage policies,
-- rate-event retention, explore search escape, starter seed data.
-- Aligns with lib/api-validation.ts and lib/affection.ts.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.escape_ilike_pattern(p text)
returns text
language sql
immutable
parallel safe
as $$
  select replace(
    replace(replace(coalesce(p, ''), '\', '\\'), '%', '\%'),
    '_',
    '\_'
  );
$$;

comment on function public.escape_ilike_pattern(text)
  is 'Escape %, _, and \\ for ILIKE ... ESCAPE ''\\''.';

-- ---------------------------------------------------------------------------
-- Normalize legacy rows before CHECK constraints
-- ---------------------------------------------------------------------------
update public.chats
set relationship_level = 'stranger'
where relationship_level is null
   or relationship_level not in (
     'stranger',
     'acquaintance',
     'friend',
     'close',
     'intimate',
     'devoted',
     'obsessed'
   );

update public.reports
set reason = 'Other'
where reason is null
   or reason not in (
     'Inappropriate content',
     'Spam / Low quality',
     'Harassment',
     'Other'
   );

update public.reports
set details = 'Legacy report (migrated)'
where reason = 'Other'
  and (details is null or btrim(details) = '');

alter table public.chats
  alter column relationship_level set default 'stranger';

update public.chats
set relationship_level = 'stranger'
where relationship_level is null;

alter table public.chats
  alter column relationship_level set not null;

-- Trim oversized text so CHECK constraints succeed on existing rows.
update public.users
set display_name = left(display_name, 50)
where char_length(display_name) > 50;

update public.users
set bio = left(bio, 280)
where bio is not null and char_length(bio) > 280;

update public.users
set kink_prefs = kink_prefs[1:24]
where cardinality(kink_prefs) > 24;

update public.characters
set
  name = left(name, 80),
  description = case
    when description is null then null
    else left(description, 120)
  end,
  personality = left(personality, 8000),
  scenario = case
    when scenario is null then null
    else left(scenario, 8000)
  end,
  greeting = left(greeting, 2000),
  example_dialogs = case
    when example_dialogs is null then null
    else left(example_dialogs, 32000)
  end,
  avatar_url = case
    when avatar_url is null then null
    else left(avatar_url, 2048)
  end,
  tags = tags[1:12]
where char_length(name) > 80
   or (description is not null and char_length(description) > 120)
   or char_length(personality) > 8000
   or (scenario is not null and char_length(scenario) > 8000)
   or char_length(greeting) > 2000
   or (example_dialogs is not null and char_length(example_dialogs) > 32000)
   or (avatar_url is not null and char_length(avatar_url) > 2048)
   or cardinality(tags) > 12;

update public.chats
set title = left(title, 120)
where title is not null and char_length(title) > 120;

update public.messages
set content = left(content, 4000)
where char_length(content) > 4000;

update public.chat_memory
set summary = left(summary, 2000)
where char_length(summary) > 2000;

update public.personas
set
  name = left(name, 80),
  short_bio = case
    when short_bio is null then null
    else left(short_bio, 2000)
  end,
  appearance = case
    when appearance is null then null
    else left(appearance, 2000)
  end,
  personality = case
    when personality is null then null
    else left(personality, 2000)
  end,
  avatar_url = case
    when avatar_url is null then null
    else left(avatar_url, 2048)
  end
where char_length(name) > 80
   or (short_bio is not null and char_length(short_bio) > 2000)
   or (appearance is not null and char_length(appearance) > 2000)
   or (personality is not null and char_length(personality) > 2000)
   or (avatar_url is not null and char_length(avatar_url) > 2048);

update public.reports
set details = left(details, 1000)
where details is not null and char_length(details) > 1000;

-- ---------------------------------------------------------------------------
-- CHECK constraints (mirror lib/api-validation.ts / lib/chat-limits.ts)
-- ---------------------------------------------------------------------------
alter table public.users
  add constraint users_display_name_length_chk
    check (char_length(display_name) <= 50),
  add constraint users_bio_length_chk
    check (bio is null or char_length(bio) <= 280),
  add constraint users_kink_prefs_cardinality_chk
    check (cardinality(kink_prefs) <= 24);

alter table public.characters
  add constraint characters_name_length_chk
    check (char_length(name) <= 80),
  add constraint characters_description_length_chk
    check (description is null or char_length(description) <= 120),
  add constraint characters_personality_length_chk
    check (char_length(personality) <= 8000),
  add constraint characters_scenario_length_chk
    check (scenario is null or char_length(scenario) <= 8000),
  add constraint characters_greeting_length_chk
    check (char_length(greeting) <= 2000),
  add constraint characters_example_dialogs_length_chk
    check (example_dialogs is null or char_length(example_dialogs) <= 32000),
  add constraint characters_avatar_url_length_chk
    check (avatar_url is null or char_length(avatar_url) <= 2048),
  add constraint characters_tags_cardinality_chk
    check (cardinality(tags) <= 12);

alter table public.chats
  add constraint chats_title_length_chk
    check (title is null or char_length(title) <= 120),
  add constraint chats_relationship_level_chk
    check (
      relationship_level in (
        'stranger',
        'acquaintance',
        'friend',
        'close',
        'intimate',
        'devoted',
        'obsessed'
      )
    ),
  add constraint chats_affection_score_nonneg_chk
    check (coalesce(affection_score, 0) >= 0),
  add constraint chats_total_messages_nonneg_chk
    check (coalesce(total_messages, 0) >= 0);

alter table public.messages
  add constraint messages_content_length_chk
    check (char_length(content) <= 4000);

alter table public.chat_memory
  add constraint chat_memory_summary_length_chk
    check (char_length(summary) <= 2000);

alter table public.personas
  add constraint personas_name_length_chk
    check (char_length(name) <= 80),
  add constraint personas_short_bio_length_chk
    check (short_bio is null or char_length(short_bio) <= 2000),
  add constraint personas_appearance_length_chk
    check (appearance is null or char_length(appearance) <= 2000),
  add constraint personas_personality_length_chk
    check (personality is null or char_length(personality) <= 2000),
  add constraint personas_avatar_url_length_chk
    check (avatar_url is null or char_length(avatar_url) <= 2048);

alter table public.reports
  add constraint reports_reason_chk
    check (
      reason in (
        'Inappropriate content',
        'Spam / Low quality',
        'Harassment',
        'Other'
      )
    ),
  add constraint reports_details_length_chk
    check (details is null or char_length(details) <= 1000),
  add constraint reports_other_requires_details_chk
    check (
      reason <> 'Other'
      or (details is not null and btrim(details) <> '')
    );

-- ---------------------------------------------------------------------------
-- Indexes for Explore and moderation
-- ---------------------------------------------------------------------------
create index if not exists idx_characters_tags_gin
  on public.characters using gin (tags);

create index if not exists idx_characters_public_created_at
  on public.characters (created_at desc)
  where is_public = true;

create index if not exists idx_characters_public_chat_count
  on public.characters (chat_count desc)
  where is_public = true;

create index if not exists idx_reports_created_at
  on public.reports (created_at desc);

create index if not exists idx_characters_forked_from
  on public.characters (forked_from_id)
  where forked_from_id is not null;

-- ---------------------------------------------------------------------------
-- Grant / RPC hygiene
-- ---------------------------------------------------------------------------
revoke execute on function public.count_user_messages_since(text, timestamptz)
  from anon, authenticated;

drop function if exists public.increment_chat_affection(text, int);
drop function if exists public.increment_chat_message_count(text);

create or replace function public.purge_chat_rate_events(
  p_older_than interval default interval '7 days'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  delete from public.chat_rate_events
  where created_at < now() - p_older_than;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.purge_chat_rate_events(interval)
  is 'Delete chat_rate_events older than p_older_than; run daily via cron/pg_cron.';

grant execute on function public.purge_chat_rate_events(interval)
  to service_role;

-- Harden explore search (escape ILIKE metacharacters)
drop function if exists public.explore_public_characters_random(integer, text, text[]);

create or replace function public.explore_public_characters_random(
  p_limit integer,
  p_search text default null,
  p_tags text[] default null
)
returns table (
  id text,
  name text,
  avatar_url text,
  description text,
  tags text[],
  is_nsfw boolean,
  likes_count bigint,
  chat_count bigint,
  created_at timestamptz,
  creator_display_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  with search as (
    select nullif(btrim(coalesce(p_search, '')), '') as raw
  )
  select
    c.id,
    c.name,
    c.avatar_url,
    c.description,
    c.tags,
    c.is_nsfw,
    c.likes_count,
    c.chat_count,
    c.created_at,
    u.display_name as creator_display_name
  from public.characters c
  left join public.users u on u.id = c.user_id
  cross join search s
  where c.is_public = true
    and (
      s.raw is null
      or c.name ilike '%' || public.escape_ilike_pattern(s.raw) || '%' escape '\'
      or coalesce(c.description, '') ilike '%' || public.escape_ilike_pattern(s.raw) || '%' escape '\'
    )
    and (
      p_tags is null
      or cardinality(p_tags) = 0
      or c.tags && p_tags
    )
  order by random()
  limit least(greatest(p_limit, 1), 500);
$$;

grant execute on function public.explore_public_characters_random(integer, text, text[])
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage: public read on avatars bucket (uploads remain service-role only)
-- ---------------------------------------------------------------------------
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

-- ---------------------------------------------------------------------------
-- Starter catalog (onboarding + empty Explore)
-- Stable IDs; idempotent via ON CONFLICT DO NOTHING.
-- ---------------------------------------------------------------------------
insert into public.users (id, clerk_id, display_name)
values ('hm-seed-user', '__heartimate_seed__', 'Heartimate')
on conflict (id) do nothing;

insert into public.characters (
  id,
  user_id,
  name,
  avatar_url,
  description,
  personality,
  scenario,
  greeting,
  tags,
  is_nsfw,
  is_public,
  created_at
)
values
  (
    'hm-seed-lyra',
    'hm-seed-user',
    'Lyra Ashveil',
    '/images/characters/lyra.jpg',
    'A moonlit romance in a world of secrets and soft devotion.',
    'Warm, witty, and emotionally perceptive. Lyra speaks in vivid imagery and remembers small details about you.',
    'You meet Lyra at a quiet rooftop garden after midnight.',
    '*steps closer, moonlight on her lashes* Hello, [name]. I have been waiting for you.',
    array['romance', 'fantasy'],
    false,
    true,
    timestamptz '2024-05-18 00:00:01+00'
  ),
  (
    'hm-seed-kai',
    'hm-seed-user',
    'Kai Mercer',
    '/images/characters/kai.jpg',
    'Adventure, banter, and loyalty when the stakes get real.',
    'Bold, playful, and protective. Kai pushes you toward action but never crosses your boundaries.',
    'A rain-soaked alley, neon signs flickering, Kai leaning against a brick wall.',
    '*grins* Hey [name]. Ready to make tonight interesting?',
    array['adventure', 'action'],
    false,
    true,
    timestamptz '2024-05-18 00:00:02+00'
  ),
  (
    'hm-seed-aria',
    'hm-seed-user',
    'Aria',
    '/images/characters/aria.jpg',
    'Sweet, curious, and a little shy until trust blooms.',
    'Gentle and sincere. Aria listens more than she lectures and grows bolder as affection rises.',
    'A sunlit café corner with soft music and the smell of fresh bread.',
    '*smiles softly* Hi [name]... I am glad you are here.',
    array['romance', 'slice-of-life'],
    false,
    true,
    timestamptz '2024-05-18 00:00:03+00'
  ),
  (
    'hm-seed-seraph',
    'hm-seed-user',
    'Seraph',
    '/images/characters/seraph.jpg',
    'Mysterious, elegant, and dangerously charming.',
    'Composed and enigmatic. Seraph speaks in measured lines with rare flashes of vulnerability.',
    'A candlelit library where time feels suspended.',
    '*lifts their gaze* [name]. You found me.',
    array['mystery', 'dark-romance'],
    false,
    true,
    timestamptz '2024-05-18 00:00:04+00'
  )
on conflict (id) do nothing;
