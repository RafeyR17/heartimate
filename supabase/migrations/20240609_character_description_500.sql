-- Align DB with app: character card description up to 500 chars (was 120).

alter table public.characters
  drop constraint if exists characters_description_length_chk;

alter table public.characters
  add constraint characters_description_length_chk
    check (description is null or char_length(description) <= 500);
