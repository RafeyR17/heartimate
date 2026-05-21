-- Enable trigram extension for fast ILIKE search on characters table.
-- Replaces full-table ILIKE scans with GIN index seeks.
create extension if not exists pg_trgm;

-- GIN trigram index on name (most-selective search field)
create index if not exists idx_characters_name_trgm
  on public.characters using gin (name gin_trgm_ops)
  where is_public = true;

-- GIN trigram index on description (secondary search field)
create index if not exists idx_characters_description_trgm
  on public.characters using gin (description gin_trgm_ops)
  where is_public = true;
