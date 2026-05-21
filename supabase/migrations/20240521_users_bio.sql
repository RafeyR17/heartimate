-- Profile fields on users
alter table public.users
  add column if not exists bio text;
