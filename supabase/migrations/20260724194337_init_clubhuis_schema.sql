-- Clubhuis — Fase 1 datamodel + Row Level Security
-- Volgt Product Blueprint v1.0: veilig, rustig, privacy als standaard, geen onbekenden.

create extension if not exists pgcrypto;

-- ============================================================================
-- Tabellen (eerst alle tabellen, functies/policies verwijzen hierna pas terug)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  role text not null default 'kind' check (role in ('kind', 'ouder', 'beheerder')),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'blocked')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_questions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.profile_answers (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.profile_questions (id) on delete cascade,
  answer text not null check (char_length(answer) <= 300),
  updated_at timestamptz not null default now(),
  primary key (profile_id, question_id)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) <= 2000),
  photo_path text,
  visibility text not null default 'friends' check (visibility in ('private', 'friends')),
  created_at timestamptz not null default now()
);

create index stories_author_idx on public.stories (author_id, created_at desc);

create table public.story_aura (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) <= 500),
  created_at timestamptz not null default now()
);

create index story_comments_story_idx on public.story_comments (story_id, created_at);

create table public.scribbles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) <= 500),
  created_at timestamptz not null default now()
);

create index scribbles_profile_idx on public.scribbles (profile_id, created_at desc);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('story', 'comment', 'scribble')),
  content_id uuid not null,
  user_id uuid references public.profiles (id) on delete set null,
  reason text not null,
  matched_term text,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

insert into storage.buckets (id, name, public)
values ('story-photos', 'story-photos', false)
on conflict (id) do nothing;

-- ============================================================================
-- Helper functies (mogen nu naar de tabellen hierboven verwijzen)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'beheerder'
  );
$$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b)
        or (requester_id = b and addressee_id = a))
  );
$$;

-- Kindaccounts: dicht tussen 22:00 en 07:00 Europe/Amsterdam. Ouders/beheerders altijd open.
create or replace function public.clubhuis_is_open(p_role text)
returns boolean
language sql
stable
as $$
  select case
    when p_role <> 'kind' then true
    else extract(hour from (now() at time zone 'Europe/Amsterdam')) >= 7
     and extract(hour from (now() at time zone 'Europe/Amsterdam')) < 22
  end;
$$;

create or replace function public.current_role_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.clubhuis_is_open(
    coalesce((select role from public.profiles where id = auth.uid()), 'kind')
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Alleen een beheerder mag rol/status van een profiel wijzigen.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role <> old.role or new.status <> old.status) and not public.is_admin() then
    raise exception 'Alleen een beheerder mag rol of status wijzigen';
  end if;
  return new;
end;
$$;

-- Nieuw account aanmaken bij registratie (via trigger op auth.users, security definer -> RLS niet nodig voor insert).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username')
  );
  return new;
end;
$$;

create or replace function public.notify(p_user_id uuid, p_type text, p_payload jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, payload) values (p_user_id, p_type, p_payload);
$$;

-- Rustige melding: vriendschapsverzoek ontvangen / geaccepteerd.
create or replace function public.notify_friendship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.addressee_id, 'friend_request', jsonb_build_object('friendship_id', new.id, 'from', new.requester_id));
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    perform public.notify(new.requester_id, 'friend_accepted', jsonb_build_object('friendship_id', new.id, 'by', new.addressee_id));
  end if;
  return new;
end;
$$;

create or replace function public.notify_aura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.stories where id = new.story_id;
  if v_author is not null and v_author <> new.user_id then
    perform public.notify(v_author, 'aura', jsonb_build_object('story_id', new.story_id, 'from', new.user_id));
  end if;
  return new;
end;
$$;

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.stories where id = new.story_id;
  if v_author is not null and v_author <> new.author_id then
    perform public.notify(v_author, 'comment', jsonb_build_object('story_id', new.story_id, 'from', new.author_id));
  end if;
  return new;
end;
$$;

create or replace function public.notify_scribble()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id <> new.author_id then
    perform public.notify(new.profile_id, 'scribble', jsonb_build_object('scribble_id', new.id, 'from', new.author_id));
  end if;
  return new;
end;
$$;

-- ============================================================================
-- Triggers
-- ============================================================================

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_privilege_escalation();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profile_answers_set_updated_at
  before update on public.profile_answers
  for each row execute function public.set_updated_at();

create trigger friendships_notify
  after insert or update on public.friendships
  for each row execute function public.notify_friendship_change();

create trigger story_aura_notify
  after insert on public.story_aura
  for each row execute function public.notify_aura();

create trigger story_comments_notify
  after insert on public.story_comments
  for each row execute function public.notify_comment();

create trigger scribbles_notify
  after insert on public.scribbles
  for each row execute function public.notify_scribble();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.profile_questions enable row level security;
alter table public.profile_answers enable row level security;
alter table public.friendships enable row level security;
alter table public.stories enable row level security;
alter table public.story_aura enable row level security;
alter table public.story_comments enable row level security;
alter table public.scribbles enable row level security;
alter table public.moderation_events enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_own_or_friend_or_admin"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.are_friends(auth.uid(), id)
    or public.is_admin()
  );

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

create policy "profile_questions_select_active_or_admin"
  on public.profile_questions for select
  using (active or public.is_admin());

create policy "profile_questions_admin_write"
  on public.profile_questions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "profile_answers_select_own_or_friend_or_admin"
  on public.profile_answers for select
  using (
    profile_id = auth.uid()
    or public.are_friends(auth.uid(), profile_id)
    or public.is_admin()
  );

create policy "profile_answers_write_own"
  on public.profile_answers for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "friendships_select_participant_or_admin"
  on public.friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());

create policy "friendships_insert_as_requester"
  on public.friendships for insert
  with check (
    requester_id = auth.uid()
    and public.current_role_open()
    and exists (select 1 from public.profiles where id = addressee_id and status = 'active')
  );

create policy "friendships_update_as_addressee_or_admin"
  on public.friendships for update
  using (addressee_id = auth.uid() or public.is_admin());

create policy "friendships_delete_own_pending_or_admin"
  on public.friendships for delete
  using (
    (requester_id = auth.uid() and status = 'pending')
    or public.is_admin()
  );

create policy "stories_select_visible"
  on public.stories for select
  using (
    author_id = auth.uid()
    or (visibility = 'friends' and public.are_friends(auth.uid(), author_id))
    or public.is_admin()
  );

create policy "stories_insert_own"
  on public.stories for insert
  with check (
    author_id = auth.uid()
    and public.current_role_open()
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );

create policy "stories_update_own_or_admin"
  on public.stories for update
  using (author_id = auth.uid() or public.is_admin());

create policy "stories_delete_own_or_admin"
  on public.stories for delete
  using (author_id = auth.uid() or public.is_admin());

create policy "story_aura_select_if_story_visible"
  on public.story_aura for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.stories s
      where s.id = story_id
        and (s.author_id = auth.uid() or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id)))
    )
  );

create policy "story_aura_insert_if_story_visible"
  on public.story_aura for insert
  with check (
    user_id = auth.uid()
    and public.current_role_open()
    and exists (
      select 1 from public.stories s
      where s.id = story_id
        and (s.author_id = auth.uid() or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id)))
    )
  );

create policy "story_aura_delete_own"
  on public.story_aura for delete
  using (user_id = auth.uid() or public.is_admin());

create policy "story_comments_select_if_story_visible"
  on public.story_comments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.stories s
      where s.id = story_id
        and (s.author_id = auth.uid() or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id)))
    )
  );

create policy "story_comments_insert_if_friend_or_own"
  on public.story_comments for insert
  with check (
    author_id = auth.uid()
    and public.current_role_open()
    and exists (
      select 1 from public.stories s
      where s.id = story_id
        and (s.author_id = auth.uid() or (s.visibility = 'friends' and public.are_friends(auth.uid(), s.author_id)))
    )
  );

create policy "story_comments_delete_own_or_admin"
  on public.story_comments for delete
  using (author_id = auth.uid() or public.is_admin());

create policy "scribbles_select_own_or_friend_or_admin"
  on public.scribbles for select
  using (
    profile_id = auth.uid()
    or public.are_friends(auth.uid(), profile_id)
    or public.is_admin()
  );

create policy "scribbles_insert_own_or_friend"
  on public.scribbles for insert
  with check (
    author_id = auth.uid()
    and public.current_role_open()
    and (profile_id = auth.uid() or public.are_friends(auth.uid(), profile_id))
  );

create policy "scribbles_delete_owner_or_author_or_admin"
  on public.scribbles for delete
  using (profile_id = auth.uid() or author_id = auth.uid() or public.is_admin());

create policy "moderation_events_admin_only"
  on public.moderation_events for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete
  using (user_id = auth.uid());

create policy "story_photos_select"
  on storage.objects for select
  using (
    bucket_id = 'story-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
      or public.is_admin()
    )
  );

create policy "story_photos_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'story-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "story_photos_delete_own_folder_or_admin"
  on storage.objects for delete
  using (
    bucket_id = 'story-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ============================================================================
-- Beperkte kaart voor zoeken: alleen actieve accounts, geen gevoelige velden.
-- ============================================================================

create view public.profile_cards
  with (security_invoker = true)
  as
  select id, username, display_name, avatar_url
  from public.profiles
  where status = 'active';

grant select on public.profile_cards to authenticated;

-- ============================================================================
-- Seed data: standaard vriendenboekje-vragen
-- ============================================================================

insert into public.profile_questions (key, label, sort_order) values
  ('hobby', 'Hobby''s', 10),
  ('huisdier', 'Huisdier', 20),
  ('lievelingseten', 'Lievelingseten', 30),
  ('muziek', 'Favoriete muziek', 40),
  ('boek', 'Favoriete boek', 50),
  ('film', 'Favoriete film', 60),
  ('game', 'Favoriete game', 70),
  ('sport_team', 'Favoriete voetballer of team', 80),
  ('later_word_ik', 'Later word ik', 90),
  ('hier_word_ik_blij_van', 'Hier word ik blij van', 100),
  ('hier_moet_ik_om_lachen', 'Hier moet ik om lachen', 110),
  ('hier_ben_ik_trots_op', 'Hier ben ik trots op', 120);
