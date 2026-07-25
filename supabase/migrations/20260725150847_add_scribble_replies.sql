-- Krabbels kunnen nu een reactie zijn op een andere krabbel (parent_id). Bij een
-- toplevel-krabbel blijft de melding naar de plekjeseigenaar gaan zoals al het geval was;
-- bij een reactie gaat de melding naar de auteur van de krabbel waarop gereageerd wordt
-- (niet nogmaals naar de plekjeseigenaar, en niet als je op je eigen reactie reageert).
alter table public.scribbles
  add column parent_id uuid references public.scribbles(id) on delete cascade;

create or replace function public.notify_scribble()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_author uuid;
begin
  if new.parent_id is not null then
    select author_id into v_parent_author from public.scribbles where id = new.parent_id;
    if v_parent_author is not null and v_parent_author <> new.author_id then
      perform public.notify(
        v_parent_author,
        'scribble_reply',
        jsonb_build_object('scribble_id', new.id, 'parent_id', new.parent_id, 'profile_id', new.profile_id, 'from', new.author_id)
      );
    end if;
  elsif new.profile_id <> new.author_id then
    perform public.notify(new.profile_id, 'scribble', jsonb_build_object('scribble_id', new.id, 'from', new.author_id));
  end if;
  return new;
end;
$$;
