-- Polls zijn een tweede soort verhaal: de vraag staat gewoon in stories.text (geen aparte
-- kolom nodig), 'kind' onderscheidt weergave. Opties en stemmen horen direct bij het verhaal.
alter table public.stories add column kind text not null default 'text' check (kind in ('text', 'poll'));

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  sort_order int not null default 0
);

create index poll_options_story_idx on public.poll_options (story_id, sort_order);

create table public.poll_votes (
  story_id uuid not null references public.stories (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index poll_votes_option_idx on public.poll_votes (option_id);

alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- Zichtbaarheid volgt precies de zichtbaarheid van het bijbehorende verhaal.
create policy "poll_options_select_if_story_visible"
  on public.poll_options for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.stories s
      where s.id = story_id
        and (s.author_id = auth.uid() or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id)))
    )
  );

-- Opties worden alleen bij het aanmaken van het verhaal zelf ingevoerd, door de auteur.
create policy "poll_options_insert_own_story"
  on public.poll_options for insert
  with check (
    exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
  );

create policy "poll_votes_select_if_story_visible"
  on public.poll_votes for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.stories s
      where s.id = story_id
        and (s.author_id = auth.uid() or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id)))
    )
  );

-- Stemmen (en een stem wijzigen) mag iedereen die het verhaal mag zien, tijdens openingsuren.
create policy "poll_votes_insert_own_if_story_visible"
  on public.poll_votes for insert
  with check (
    user_id = auth.uid()
    and public.current_role_open()
    and exists (
      select 1 from public.stories s
      where s.id = story_id
        and (s.author_id = auth.uid() or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id)))
    )
  );

create policy "poll_votes_update_own"
  on public.poll_votes for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.current_role_open()
    and exists (
      select 1 from public.stories s
      where s.id = story_id
        and (s.author_id = auth.uid() or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id)))
    )
  );
