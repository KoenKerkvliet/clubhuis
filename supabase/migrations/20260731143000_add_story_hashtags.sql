alter table public.stories
  add column tags text[] not null default '{}'::text[],
  add constraint stories_tags_max_three check (cardinality(tags) <= 3);

create index stories_tags_idx on public.stories using gin (tags);

create or replace function public.extract_story_tags(p_text text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  with matches as (
    select lower(match[2]) as tag, position
    from regexp_matches(p_text, '(^|[^[:alnum:]_])#([[:alnum:]_]{2,30})', 'g') with ordinality as found(match, position)
  ),
  first_seen as (
    select tag, min(position) as position
    from matches
    where tag <> ''
    group by tag
  )
  select coalesce(array_agg(tag order by position), '{}'::text[])
  from (
    select tag, position
    from first_seen
    order by position
    limit 3
  ) limited;
$$;

create or replace function public.set_story_tags()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.tags := public.extract_story_tags(new.text);
  return new;
end;
$$;

create trigger stories_set_tags
  before insert or update of text on public.stories
  for each row
  execute function public.set_story_tags();

update public.stories
set tags = public.extract_story_tags(text);

alter table public.profiles
  add column hashtag_intro_seen_at timestamptz;
