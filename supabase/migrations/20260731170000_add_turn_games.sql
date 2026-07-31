create table if not exists public.game_matches (
  id uuid primary key default gen_random_uuid(),
  game_type text not null check (game_type in ('connect_four', 'tic_tac_toe')),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  board text[] not null,
  current_turn_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'won', 'draw', 'cancelled')),
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_matches_two_players check (creator_id <> opponent_id)
);

create index if not exists game_matches_creator_idx
  on public.game_matches (creator_id, game_type, updated_at desc);

create index if not exists game_matches_opponent_idx
  on public.game_matches (opponent_id, game_type, updated_at desc);

alter table public.game_matches enable row level security;

drop policy if exists "game_matches_select_participants" on public.game_matches;
create policy "game_matches_select_participants"
  on public.game_matches for select
  using (creator_id = auth.uid() or opponent_id = auth.uid() or public.is_admin());

create or replace function public.game_match_has_line(
  p_board text[],
  p_columns int,
  p_rows int,
  p_token text,
  p_needed int
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  x int;
  y int;
  step int;
  dx int;
  dy int;
  directions int[][] := array[array[1, 0], array[0, 1], array[1, 1], array[1, -1]];
  direction int[];
  nx int;
  ny int;
  idx int;
begin
  foreach direction slice 1 in array directions loop
    dx := direction[1];
    dy := direction[2];

    for y in 0..(p_rows - 1) loop
      for x in 0..(p_columns - 1) loop
        for step in 0..(p_needed - 1) loop
          nx := x + (dx * step);
          ny := y + (dy * step);

          if nx < 0 or nx >= p_columns or ny < 0 or ny >= p_rows then
            exit;
          end if;

          idx := (ny * p_columns) + nx + 1;
          if coalesce(p_board[idx], '') <> p_token then
            exit;
          end if;

          if step = p_needed - 1 then
            return true;
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  return false;
end;
$$;

create or replace function public.create_game_match(p_game_type text, p_opponent_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid := auth.uid();
  v_board_size int;
  v_game_id uuid;
begin
  if v_creator_id is null then
    raise exception 'Niet ingelogd.';
  end if;

  if p_game_type not in ('connect_four', 'tic_tac_toe') then
    raise exception 'Onbekend spel.';
  end if;

  if v_creator_id = p_opponent_id then
    raise exception 'Kies een vriend om mee te spelen.';
  end if;

  if not public.current_role_open() then
    raise exception 'Clubhuis is nu gesloten.';
  end if;

  if not exists (select 1 from public.profiles where id = v_creator_id and status = 'active') then
    raise exception 'Je account is niet actief.';
  end if;

  if not public.are_friends(v_creator_id, p_opponent_id) then
    raise exception 'Je kunt alleen met vrienden spelen.';
  end if;

  v_board_size := case when p_game_type = 'connect_four' then 42 else 9 end;

  insert into public.game_matches (game_type, creator_id, opponent_id, board, current_turn_id)
  values (p_game_type, v_creator_id, p_opponent_id, array_fill(''::text, array[v_board_size]), v_creator_id)
  returning id into v_game_id;

  return v_game_id;
end;
$$;

create or replace function public.play_game_match_move(p_game_id uuid, p_position int)
returns public.game_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_game public.game_matches;
  v_board text[];
  v_columns int;
  v_rows int;
  v_needed int;
  v_position int;
  v_index int;
  v_row int;
  v_token text;
  v_next_turn uuid;
  v_won boolean;
  v_draw boolean;
begin
  if v_user_id is null then
    raise exception 'Niet ingelogd.';
  end if;

  select *
    into v_game
  from public.game_matches
  where id = p_game_id;

  if v_game.id is null then
    raise exception 'Spel niet gevonden.';
  end if;

  if v_user_id <> v_game.creator_id and v_user_id <> v_game.opponent_id then
    raise exception 'Je speelt niet mee met dit spel.';
  end if;

  if v_game.status <> 'active' then
    return v_game;
  end if;

  if v_game.current_turn_id <> v_user_id then
    raise exception 'Je vriend is aan de beurt.';
  end if;

  if not public.current_role_open() then
    raise exception 'Clubhuis is nu gesloten.';
  end if;

  v_board := v_game.board;
  v_token := case when v_user_id = v_game.creator_id then 'creator' else 'opponent' end;
  v_next_turn := case when v_user_id = v_game.creator_id then v_game.opponent_id else v_game.creator_id end;

  if v_game.game_type = 'connect_four' then
    v_columns := 7;
    v_rows := 6;
    v_needed := 4;

    if p_position < 0 or p_position >= v_columns then
      raise exception 'Kies een kolom.';
    end if;

    v_index := null;
    for v_row in reverse (v_rows - 1)..0 loop
      v_position := (v_row * v_columns) + p_position + 1;
      if coalesce(v_board[v_position], '') = '' then
        v_index := v_position;
        exit;
      end if;
    end loop;

    if v_index is null then
      raise exception 'Deze kolom is vol.';
    end if;
  else
    v_columns := 3;
    v_rows := 3;
    v_needed := 3;

    if p_position < 0 or p_position >= 9 then
      raise exception 'Kies een vakje.';
    end if;

    v_index := p_position + 1;
    if coalesce(v_board[v_index], '') <> '' then
      raise exception 'Dit vakje is al bezet.';
    end if;
  end if;

  v_board[v_index] := v_token;
  v_won := public.game_match_has_line(v_board, v_columns, v_rows, v_token, v_needed);

  select not exists (
    select 1
    from unnest(v_board) as cell
    where cell = ''
  )
  into v_draw;

  update public.game_matches
  set board = v_board,
      current_turn_id = case when v_won or v_draw then current_turn_id else v_next_turn end,
      status = case when v_won then 'won' when v_draw then 'draw' else 'active' end,
      winner_id = case when v_won then v_user_id else null end,
      updated_at = now()
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;
