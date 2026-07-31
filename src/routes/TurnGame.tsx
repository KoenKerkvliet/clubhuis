import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TitleHeader } from '@/components/layout/PageHeader'
import { ArrowRightIcon } from '@/components/ui/icons'

const gameDb = supabase as any

type GameType = 'connect_four' | 'tic_tac_toe'
type GameStatus = 'active' | 'won' | 'draw' | 'cancelled'

interface FriendRow {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
}

interface GameMatch {
  id: string
  game_type: GameType
  creator_id: string
  opponent_id: string
  board: string[]
  current_turn_id: string
  status: GameStatus
  winner_id: string | null
  created_at: string
  updated_at: string
}

interface Config {
  type: GameType
  title: string
  introTitle: string
  introText: string
  createLabel: string
  listTitle: string
  emptyText: string
  themeClassName: string
  columns: number
  rows: number
}

const configs: Record<GameType, Config> = {
  connect_four: {
    type: 'connect_four',
    title: '4 op een rij',
    introTitle: 'Daag een vriend uit',
    introText: 'Laat om de beurt een fiche vallen. Wie als eerste vier op een rij heeft, wint.',
    createLabel: 'Start 4 op een rij',
    listTitle: 'Mijn 4-op-een-rij-spellen',
    emptyText: 'Nog geen 4-op-een-rij-spellen. Nodig hierboven een vriend uit.',
    themeClassName: 'bg-avatar-blue-bg text-avatar-blue-text',
    columns: 7,
    rows: 6,
  },
  tic_tac_toe: {
    type: 'tic_tac_toe',
    title: 'Boter-kaas-en-eieren',
    introTitle: 'Speel snel een potje',
    introText: 'Zet om de beurt een teken. Drie op een rij wint. Simpel, snel en leuk tussendoor.',
    createLabel: 'Start boter-kaas-en-eieren',
    listTitle: 'Mijn boter-kaas-en-eieren-spellen',
    emptyText: 'Nog geen boter-kaas-en-eieren-spellen. Nodig hierboven een vriend uit.',
    themeClassName: 'bg-avatar-peach-bg text-avatar-peach-text',
    columns: 3,
    rows: 3,
  },
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function markFor(game: GameMatch, profileId: string | undefined, value: string) {
  if (!value) return ''
  const creatorMark = game.game_type === 'connect_four' ? '●' : '×'
  const opponentMark = game.game_type === 'connect_four' ? '●' : '○'
  if (value === 'creator') return creatorMark
  if (value === 'opponent') return opponentMark
  return value === profileId ? creatorMark : opponentMark
}

function markClass(game: GameMatch, value: string) {
  if (!value) return game.game_type === 'connect_four' ? 'bg-paper/90' : 'bg-paper'
  return value === 'creator'
    ? 'bg-aura text-aura-text'
    : 'bg-avatar-green-bg text-avatar-green-text'
}

function TurnGamePage({ type }: { type: GameType }) {
  const config = configs[type]
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [games, setGames] = useState<GameMatch[]>([])
  const [profilesById, setProfilesById] = useState<Record<string, FriendRow>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busyGameId, setBusyGameId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    loadFriends()
    loadGames()
  }, [profile?.id, type])

  async function loadFriends() {
    if (!profile) return
    const { data } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`)

    const rows = (data ?? []) as { requester_id: string; addressee_id: string }[]
    const friendIds = [...new Set(rows.map((row) => (row.requester_id === profile.id ? row.addressee_id : row.requester_id)))]

    const { data: friendProfiles } = friendIds.length
      ? await supabase.from('profile_cards').select('id, username, display_name, avatar_url').in('id', friendIds)
      : { data: [] }

    const nextFriends = ((friendProfiles ?? []) as FriendRow[]).sort((a, b) =>
      a.display_name.localeCompare(b.display_name, 'nl'),
    )
    setFriends(nextFriends)
    if (!selectedFriendId && nextFriends[0]) setSelectedFriendId(nextFriends[0].id)
  }

  async function loadGames() {
    if (!profile) return
    setLoading(true)
    const { data } = await gameDb
      .from('game_matches')
      .select('id, game_type, creator_id, opponent_id, board, current_turn_id, status, winner_id, created_at, updated_at')
      .eq('game_type', type)
      .or(`creator_id.eq.${profile.id},opponent_id.eq.${profile.id}`)
      .order('updated_at', { ascending: false })
      .limit(20)

    const rows = (data ?? []) as GameMatch[]
    setGames(rows)

    const playerIds = [...new Set(rows.flatMap((game) => [game.creator_id, game.opponent_id]))]
    const { data: playerProfiles } = playerIds.length
      ? await supabase.from('profile_cards').select('id, username, display_name, avatar_url').in('id', playerIds)
      : { data: [] }
    setProfilesById(Object.fromEntries(((playerProfiles ?? []) as FriendRow[]).map((p) => [p.id, p])))
    setLoading(false)
  }

  async function createGame() {
    if (!selectedFriendId) return
    setError(null)
    setCreating(true)
    const { error: createError } = await gameDb.rpc('create_game_match', {
      p_game_type: type,
      p_opponent_id: selectedFriendId,
    })
    setCreating(false)

    if (createError) {
      setError(createError.message || 'Spel aanmaken lukte niet.')
      return
    }

    await loadGames()
  }

  async function playMove(gameId: string, position: number) {
    setError(null)
    setBusyGameId(gameId)
    const { error: moveError } = await gameDb.rpc('play_game_match_move', {
      p_game_id: gameId,
      p_position: position,
    })
    setBusyGameId(null)

    if (moveError) {
      setError(moveError.message || 'Zet plaatsen lukte niet.')
      return
    }

    await loadGames()
  }

  function renderBoard(game: GameMatch) {
    const isMyTurn = game.status === 'active' && game.current_turn_id === profile?.id
    const isConnectFour = game.game_type === 'connect_four'
    const gridStyle = { gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` }

    return (
      <div className="flex flex-col gap-2">
        {isConnectFour && isMyTurn && (
          <div className="grid gap-1.5" style={gridStyle}>
            {Array.from({ length: config.columns }).map((_, column) => (
              <button
                key={column}
                type="button"
                disabled={busyGameId === game.id || Boolean(game.board[column])}
                onClick={() => playMove(game.id, column)}
                className="rounded-pill bg-blue-500 px-1 py-2 text-xs font-extrabold text-paper shadow-softer disabled:opacity-40"
              >
                ↓
              </button>
            ))}
          </div>
        )}

        <div
          className={`grid gap-1.5 rounded-card p-2 ${isConnectFour ? 'bg-blue-500' : 'bg-cream'}`}
          style={gridStyle}
        >
          {game.board.map((cell, index) => {
            const disabled = !isMyTurn || busyGameId === game.id || Boolean(cell)
            const isTicTacToe = game.game_type === 'tic_tac_toe'
            return (
              <button
                key={index}
                type="button"
                disabled={isTicTacToe ? disabled : true}
                onClick={() => playMove(game.id, index)}
                className={`flex aspect-square items-center justify-center font-extrabold shadow-softer transition-transform active:scale-95 ${
                  isConnectFour
                    ? `rounded-full text-sm ${markClass(game, cell)}`
                    : `rounded-2xl text-3xl ${markClass(game, cell)} ${disabled ? '' : 'hover:bg-blue-50'}`
                }`}
              >
                {markFor(game, profile?.id, cell)}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderGame(game: GameMatch) {
    const isCreator = game.creator_id === profile?.id
    const otherId = isCreator ? game.opponent_id : game.creator_id
    const other = profilesById[otherId]
    const currentTurnName = game.current_turn_id === profile?.id ? 'jij' : profilesById[game.current_turn_id]?.display_name
    const winnerName = game.winner_id === profile?.id ? 'jij' : profilesById[game.winner_id ?? '']?.display_name
    const statusText =
      game.status === 'active'
        ? `${currentTurnName ?? 'Je vriend'} is aan de beurt`
        : game.status === 'draw'
          ? 'Gelijkspel'
          : `${winnerName ?? 'Iemand'} heeft gewonnen`

    return (
      <Card key={game.id} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={other?.display_name ?? '?'} avatarPath={other?.avatar_url} size={42} />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-ink-900">Tegen {other?.display_name ?? 'je vriend'}</p>
            <p className="text-xs font-bold text-ink-400">{timeLabel(game.updated_at)}</p>
          </div>
          <span className="rounded-pill bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-500">{statusText}</span>
        </div>

        {renderBoard(game)}

        {game.status === 'active' && game.current_turn_id !== profile?.id && (
          <p className="text-sm font-semibold text-ink-400">Wachten tot je vriend een zet doet.</p>
        )}
      </Card>
    )
  }

  const canCreate = useMemo(() => friends.length > 0 && selectedFriendId, [friends.length, selectedFriendId])

  return (
    <div className="flex flex-col gap-5">
      <TitleHeader title={config.title} onBack={() => navigate('/spellen')} />

      <Card className={config.themeClassName}>
        <p className="text-xs font-extrabold uppercase tracking-wide opacity-70">Nieuw spel</p>
        <h1 className="mt-2 text-2xl font-extrabold">{config.introTitle}</h1>
        <p className="mt-1 text-sm font-semibold leading-relaxed opacity-80">{config.introText}</p>

        <div className="mt-4 flex flex-col gap-3">
          <select
            className="rounded-2xl border-none bg-paper px-4 py-3 font-bold text-ink-700 outline-none"
            value={selectedFriendId}
            onChange={(e) => setSelectedFriendId(e.target.value)}
          >
            {friends.length === 0 ? (
              <option value="">Nog geen vrienden</option>
            ) : (
              friends.map((friend) => (
                <option key={friend.id} value={friend.id}>
                  {friend.display_name}
                </option>
              ))
            )}
          </select>

          {error && <p className="text-sm font-extrabold text-warn-text">{error}</p>}

          <Button type="button" onClick={createGame} disabled={creating || !canCreate} className="w-full">
            {creating ? 'Spel maken...' : config.createLabel}
            <ArrowRightIcon width={17} height={17} />
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="font-extrabold text-ink-900">{config.listTitle}</p>
        <button type="button" onClick={loadGames} className="text-sm font-extrabold text-blue-500">
          Ververs
        </button>
      </div>

      {loading && <Card className="text-center text-ink-400">Spellen laden...</Card>}
      {!loading && games.length === 0 && <Card className="text-center text-ink-400">{config.emptyText}</Card>}
      {!loading && games.map(renderGame)}
    </div>
  )
}

export function ConnectFour() {
  return <TurnGamePage type="connect_four" />
}

export function TicTacToe() {
  return <TurnGamePage type="tic_tac_toe" />
}
