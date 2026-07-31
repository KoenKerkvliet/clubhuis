alter table public.hangman_games
  add column if not exists revealed_word text[] not null default '{}'::text[];

update public.hangman_games g
set revealed_word = (
  select array_agg(
    case
      when substr(s.word, i, 1) = any(g.guessed_letters) then substr(s.word, i, 1)
      else ''
    end
    order by i
  )
  from public.hangman_secrets s
  cross join generate_series(1, char_length(s.word)) as i
  where s.game_id = g.id
)
where coalesce(array_length(g.revealed_word, 1), 0) = 0;

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

  insert into public.hangman_games (creator_id, guesser_id, revealed_word)
  values (v_creator_id, p_guesser_id, array_fill(''::text, array[char_length(v_word)]))
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
  v_revealed text[];
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

  select array_agg(
    case
      when substr(v_word, i, 1) = any(v_letters) then substr(v_word, i, 1)
      else ''
    end
    order by i
  )
  into v_revealed
  from generate_series(1, char_length(v_word)) as i;

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
      revealed_word = v_revealed,
      wrong_guesses = v_wrong,
      status = v_status,
      winner_id = v_winner,
      updated_at = now()
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;
