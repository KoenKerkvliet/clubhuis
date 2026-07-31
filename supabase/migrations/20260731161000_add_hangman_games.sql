create table if not exists public.hangman_games (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  guesser_id uuid not null references public.profiles(id) on delete cascade,
  guessed_letters text[] not null default '{}'::text[],
  wrong_guesses int not null default 0 check (wrong_guesses between 0 and 6),
  status text not null default 'active' check (status in ('active', 'won', 'lost', 'cancelled')),
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hangman_games_two_players check (creator_id <> guesser_id)
);

create index if not exists hangman_games_creator_idx
  on public.hangman_games (creator_id, updated_at desc);

create index if not exists hangman_games_guesser_idx
  on public.hangman_games (guesser_id, updated_at desc);

create table if not exists public.hangman_secrets (
  game_id uuid primary key references public.hangman_games(id) on delete cascade,
  word text not null check (word ~ '^[a-z]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.hangman_games enable row level security;
alter table public.hangman_secrets enable row level security;

drop policy if exists "hangman_games_select_participants" on public.hangman_games;
create policy "hangman_games_select_participants"
  on public.hangman_games for select
  using (creator_id = auth.uid() or guesser_id = auth.uid() or public.is_admin());

drop policy if exists "hangman_secrets_select_creator" on public.hangman_secrets;
create policy "hangman_secrets_select_creator"
  on public.hangman_secrets for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.hangman_games g
      where g.id = game_id
        and g.creator_id = auth.uid()
    )
  );

create or replace function public.normalize_hangman_word(p_word text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(coalesce(p_word, '')), '[^a-z]', '', 'g');
$$;

create or replace function public.create_hangman_game(p_guesser_id uuid, p_word text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid := auth.uid();
  v_word text := public.normalize_hangman_word(p_word);
  v_game_id uuid;
begin
  if v_creator_id is null then
    raise exception 'Niet ingelogd.';
  end if;

  if char_length(v_word) < 3 or char_length(v_word) > 20 then
    raise exception 'Kies een woord van 3 tot 20 letters.';
  end if;

  if v_creator_id = p_guesser_id then
    raise exception 'Kies een vriend om mee te spelen.';
  end if;

  if not public.current_role_open() then
    raise exception 'Clubhuis is nu gesloten.';
  end if;

  if not exists (select 1 from public.profiles where id = v_creator_id and status = 'active') then
    raise exception 'Je account is niet actief.';
  end if;

  if not public.are_friends(v_creator_id, p_guesser_id) then
    raise exception 'Je kunt alleen met vrienden spelen.';
  end if;

  insert into public.hangman_games (creator_id, guesser_id)
  values (v_creator_id, p_guesser_id)
  returning id into v_game_id;

  insert into public.hangman_secrets (game_id, word)
  values (v_game_id, v_word);

  return v_game_id;
end;
$$;

create or replace function public.guess_hangman_letter(p_game_id uuid, p_letter text)
returns public.hangman_games
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_letter text := lower(substr(coalesce(p_letter, ''), 1, 1));
  v_game public.hangman_games;
  v_word text;
  v_letters text[];
  v_wrong int;
  v_completed boolean;
  v_status text;
  v_winner uuid;
begin
  if v_user_id is null then
    raise exception 'Niet ingelogd.';
  end if;

  if v_letter !~ '^[a-z]$' then
    raise exception 'Kies één letter.';
  end if;

  select *
    into v_game
  from public.hangman_games
  where id = p_game_id;

  if v_game.id is null then
    raise exception 'Spel niet gevonden.';
  end if;

  select word
    into v_word
  from public.hangman_secrets
  where game_id = p_game_id;

  if v_game.guesser_id <> v_user_id then
    raise exception 'Alleen de rader mag letters kiezen.';
  end if;

  if v_game.status <> 'active' then
    return v_game;
  end if;

  if not public.current_role_open() then
    raise exception 'Clubhuis is nu gesloten.';
  end if;

  if v_letter = any(v_game.guessed_letters) then
    return v_game;
  end if;

  v_letters := array_append(v_game.guessed_letters, v_letter);
  v_wrong := v_game.wrong_guesses + case when position(v_letter in v_word) = 0 then 1 else 0 end;

  select bool_and(substr(v_word, i, 1) = any(v_letters))
    into v_completed
  from generate_series(1, char_length(v_word)) as i;

  v_status := case
    when v_completed then 'won'
    when v_wrong >= 6 then 'lost'
    else 'active'
  end;
  v_winner := case
    when v_status = 'won' then v_game.guesser_id
    when v_status = 'lost' then v_game.creator_id
    else null
  end;

  update public.hangman_games
  set guessed_letters = v_letters,
      wrong_guesses = v_wrong,
      status = v_status,
      winner_id = v_winner,
      updated_at = now()
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;
