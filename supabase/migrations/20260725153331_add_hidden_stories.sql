-- Persoonlijke filter: een bericht van een vriend uit je eigen feed verbergen (met de
-- mogelijkheid het weer te tonen). Puur een voorkeur van de kijker zelf, geen sociaal
-- signaal richting de auteur — dus geen notificatie-trigger nodig, in tegenstelling tot
-- aura/krabbels/reacties.
create table public.hidden_stories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

alter table public.hidden_stories enable row level security;

create policy "hidden_stories_select_own"
  on public.hidden_stories for select
  using (user_id = auth.uid());

create policy "hidden_stories_insert_own"
  on public.hidden_stories for insert
  with check (user_id = auth.uid());

create policy "hidden_stories_delete_own"
  on public.hidden_stories for delete
  using (user_id = auth.uid());
