-- Atomic likes_count on character_likes insert/delete
create or replace function update_likes_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.characters
    set likes_count = likes_count + 1
    where id = NEW.character_id;
  elsif TG_OP = 'DELETE' then
    update public.characters
    set likes_count = greatest(likes_count - 1, 0)
    where id = OLD.character_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists character_likes_count_trigger on public.character_likes;

create trigger character_likes_count_trigger
  after insert or delete on public.character_likes
  for each row execute function update_likes_count();
