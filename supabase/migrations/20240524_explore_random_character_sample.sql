-- Bounded random sample for Explore ("random" sort) without loading the full public catalog.
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
  where c.is_public = true
    and (
      p_search is null
      or btrim(p_search) = ''
      or c.name ilike '%' || p_search || '%'
      or coalesce(c.description, '') ilike '%' || p_search || '%'
    )
    and (
      p_tags is null
      or cardinality(p_tags) = 0
      or c.tags && p_tags
    )
  order by random()
  limit least(greatest(p_limit, 1), 500);
$$;

comment on function public.explore_public_characters_random(integer, text, text[])
  is 'Random public character sample with same filters as Explore; capped at 500 rows per call.';

grant execute on function public.explore_public_characters_random(integer, text, text[])
  to anon, authenticated, service_role;
