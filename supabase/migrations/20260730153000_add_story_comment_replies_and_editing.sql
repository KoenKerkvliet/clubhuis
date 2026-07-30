-- Reacties onder verhalen zijn bewerkbaar door de auteur en kunnen op elkaar antwoorden.
alter table public.story_comments
  add column parent_id uuid references public.story_comments(id) on delete cascade;

create index story_comments_parent_idx
  on public.story_comments (parent_id, created_at);

create policy "story_comments_update_own"
  on public.story_comments for update
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and public.current_role_open()
    and exists (
      select 1 from public.stories s
      where s.id = story_id
        and (
          s.author_id = auth.uid()
          or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id))
        )
    )
  );

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  if new.parent_id is not null then
    select author_id into v_recipient
    from public.story_comments
    where id = new.parent_id;
  else
    select author_id into v_recipient
    from public.stories
    where id = new.story_id;
  end if;

  if v_recipient is not null and v_recipient <> new.author_id then
    perform public.notify(
      v_recipient,
      'comment',
      jsonb_build_object(
        'story_id', new.story_id,
        'comment_id', new.id,
        'parent_id', new.parent_id,
        'from', new.author_id
      )
    );
  end if;
  return new;
end;
$$;
