import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TitleHeader } from '@/components/layout/PageHeader'
import { ArrowRightIcon } from '@/components/ui/icons'

const MAX_WRONG_GUESSES = 6
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')
const gameDb = supabase as any

interface FriendRow {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
}

interface HangmanGame {
  id: string
  creator_id: string
  guesser_id: string
  guessed_letters: string[]
  revealed_word: string[]
  wrong_guesses: number
  status: 'active' | 'won' | 'lost' | 'cancelled'
  winner_id: string | null
  created_at: string
  updated_at: string
}

interface HangmanSecret {
  game_id: string
  word: string
}

function normalizeWord(value: string) {
  return value
    .toLocaleLowerCase('nl-NL')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

function maskWord(word: string | null, guessedLetters: string[]) {
  if (!word) return null
  return word
    .split('')
    .map((letter) => (guessedLetters.includes(letter) ? letter : '_'))
    .join(' ')
}

function revealedFromSecret(word: string | null, guessedLetters: string[]) {
  if (!word) return []
  return word.split('').map((letter) => (guessedLetters.includes(letter) ? letter : ''))
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HangmanDrawing({ wrongGuesses }: { wrongGuesses: number }) {
  const stage = Math.max(0, Math.min(MAX_WRONG_GUESSES, wrongGuesses))

  return (
    <div className="rounded-card bg-cream p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink-400">Poppetje</p>
          <p className="mt-1 text-sm font-semibold text-ink-500">
            {stage === 0 ? 'Nog geen missers.' : `${stage} van ${MAX_WRONG_GUESSES} missers.`}
          </p>
        </div>
        <span className="rounded-pill bg-paper px-3 py-1 text-xs font-extrabold text-ink-500">
          {MAX_WRONG_GUESSES - stage} over
        </span>
      </div>

      <svg viewBox="0 0 180 150" className="mt-3 h-36 w-full text-ink-700" role="img" aria-label={`${stage} missers`}>
        <line x1="25" y1="135" x2="130" y2="135" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <line x1="48" y1="135" x2="48" y2="18" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <line x1="48" y1="18" x2="118" y2="18" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <line x1="118" y1="18" x2="118" y2="35" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        {stage >= 1 && <circle cx="118" cy="49" r="14" fill="none" stroke="currentColor" strokeWidth="5" />}
        {stage >= 2 && <line x1="118" y1="63" x2="118" y2="95" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
        {stage >= 3 && <line x1="118" y1="72" x2="96" y2="86" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
        {stage >= 4 && <line x1="118" y1="72" x2="140" y2="86" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
        {stage >= 5 && <line x1="118" y1="95" x2="100" y2="120" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
        {stage >= 6 && <line x1="118" y1="95" x2="136" y2="120" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
      </svg>
    </div>
  )
}

function RevealedWord({ letters }: { letters: string[] }) {
  if (letters.length === 0) {
    return (
      <p className="text-sm font-semibold text-ink-400">
        Het woord wordt geladen...
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {letters.map((letter, index) => (
        <span
          key={`${index}-${letter}`}
          className={`flex h-12 min-w-10 items-center justify-center rounded-2xl px-2 text-xl font-extrabold uppercase shadow-softer ${
            letter ? 'bg-aura text-aura-text' : 'bg-paper text-ink-300'
          }`}
        >
          {letter || ''}
        </span>
      ))}
    </div>
  )
}

export function Hangman() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [word, setWord] = useState('')
  const [games, setGames] = useState<HangmanGame[]>([])
  const [profilesById, setProfilesById] = useState<Record<string, FriendRow>>({})
  const [secretsByGame, setSecretsByGame] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busyGameId, setBusyGameId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const normalizedWord = useMemo(() => normalizeWord(word), [word])

  useEffect(() => {
    if (!profile) return
    loadFriends()
    loadGames()
  }, [profile?.id])

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
      .from('hangman_games')
      .select('id, creator_id, guesser_id, guessed_letters, revealed_word, wrong_guesses, status, winner_id, created_at, updated_at')
      .or(`creator_id.eq.${profile.id},guesser_id.eq.${profile.id}`)
      .order('updated_at', { ascending: false })
      .limit(20)

    const rows = (data ?? []) as HangmanGame[]
    setGames(rows)

    const playerIds = [...new Set(rows.flatMap((game) => [game.creator_id, game.guesser_id]))]
    const { data: playerProfiles } = playerIds.length
      ? await supabase.from('profile_cards').select('id, username, display_name, avatar_url').in('id', playerIds)
      : { data: [] }
    const profileMap = Object.fromEntries(((playerProfiles ?? []) as FriendRow[]).map((p) => [p.id, p]))
    setProfilesById(profileMap)

    const ownGameIds = rows.filter((game) => game.creator_id === profile.id).map((game) => game.id)
    const { data: secrets } = ownGameIds.length
      ? await gameDb.from('hangman_secrets').select('game_id, word').in('game_id', ownGameIds)
      : { data: [] }
    setSecretsByGame(Object.fromEntries(((secrets ?? []) as HangmanSecret[]).map((secret) => [secret.game_id, secret.word])))
    setLoading(false)
  }

  async function createGame() {
    if (!profile || !selectedFriendId) return
    setError(null)

    if (normalizedWord.length < 3 || normalizedWord.length > 20) {
      setError('Kies een woord van 3 tot 20 letters.')
      return
    }

    setCreating(true)
    const { error: createError } = await gameDb.rpc('create_hangman_game', {
      p_guesser_id: selectedFriendId,
      p_word: normalizedWord,
    })
    setCreating(false)

    if (createError) {
      setError(createError.message || 'Spel aanmaken lukte niet.')
      return
    }

    setWord('')
    await loadGames()
  }

  async function guessLetter(gameId: string, letter: string) {
    setBusyGameId(gameId)
    setError(null)
    const { error: guessError } = await gameDb.rpc('guess_hangman_letter', {
      p_game_id: gameId,
      p_letter: letter,
    })
    setBusyGameId(null)

    if (guessError) {
      setError(guessError.message || 'Letter kiezen lukte niet.')
      return
    }

    await loadGames()
  }

  function renderGame(game: HangmanGame) {
    const isCreator = game.creator_id === profile?.id
    const otherId = isCreator ? game.guesser_id : game.creator_id
    const other = profilesById[otherId]
    const secret = secretsByGame[game.id] ?? null
    const masked = isCreator ? maskWord(secret, game.guessed_letters) : null
    const visibleLetters = isCreator ? revealedFromSecret(secret, game.guessed_letters) : game.revealed_word
    const remaining = MAX_WRONG_GUESSES - game.wrong_guesses
    const isMyTurn = !isCreator && game.status === 'active'
    const winnerName = game.winner_id === profile?.id ? 'jij' : profilesById[game.winner_id ?? '']?.display_name

    return (
      <Card key={game.id} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={other?.display_name ?? '?'} avatarPath={other?.avatar_url} size={42} />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-ink-900">
              {isCreator ? `${other?.display_name ?? 'Je vriend'} raadt` : `${other?.display_name ?? 'Je vriend'} maakte dit woord`}
            </p>
            <p className="text-xs font-bold text-ink-400">{timeLabel(game.updated_at)}</p>
          </div>
          <span className="rounded-pill bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-500">
            {game.status === 'active' ? `${remaining} missers over` : game.status === 'won' ? 'Geraden' : 'Niet geraden'}
          </span>
        </div>

        {isCreator ? (
          <div className="rounded-card bg-cream p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-ink-400">Jouw woord</p>
            <div className="mt-3">
              <RevealedWord letters={visibleLetters} />
            </div>
            <p className="sr-only">{masked ?? ''}</p>
            <p className="mt-2 text-sm font-semibold text-ink-400">Geheim woord: {secret ?? 'verborgen'}</p>
          </div>
        ) : (
          <div className="rounded-card bg-blue-50 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-blue-500">Jij raadt</p>
            <div className="mt-3">
              <RevealedWord letters={visibleLetters} />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-500">
              Goede letters verschijnen meteen op de juiste plek.
            </p>
          </div>
        )}

        <HangmanDrawing wrongGuesses={game.wrong_guesses} />

        <div className="flex flex-wrap gap-2">
          {game.guessed_letters.length === 0 ? (
            <p className="text-sm font-semibold text-ink-400">Nog geen letters gekozen.</p>
          ) : (
            game.guessed_letters.map((letter) => (
              <span key={letter} className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-badge text-sm font-extrabold text-ink-700">
                {letter.toUpperCase()}
              </span>
            ))
          )}
        </div>

        {game.status !== 'active' && (
          <p className="rounded-2xl bg-avatar-green-bg px-4 py-2 text-sm font-extrabold text-avatar-green-text">
            {winnerName ? `${winnerName} heeft gewonnen.` : 'Het spel is klaar.'}
          </p>
        )}

        {isMyTurn && (
          <div className="grid grid-cols-7 gap-1.5">
            {LETTERS.map((letter) => (
              <button
                key={letter}
                type="button"
                disabled={game.guessed_letters.includes(letter) || busyGameId === game.id}
                onClick={() => guessLetter(game.id, letter)}
                className="flex aspect-square items-center justify-center rounded-xl bg-paper text-sm font-extrabold uppercase text-ink-700 shadow-softer disabled:bg-neutral-badge disabled:text-ink-300"
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {isCreator && game.status === 'active' && (
          <p className="text-sm font-semibold text-ink-400">
            Wachten tot je vriend een letter kiest.
          </p>
        )}
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <TitleHeader title="Galgje" onBack={() => navigate('/spellen')} />

      <Card className="bg-avatar-sand-bg text-avatar-sand-text">
        <p className="text-xs font-extrabold uppercase tracking-wide opacity-70">Nieuw spel</p>
        <h1 className="mt-2 text-2xl font-extrabold">Kies een woord voor je vriend</h1>
        <p className="mt-1 text-sm font-semibold leading-relaxed opacity-80">
          Jij bedenkt het geheime woord. Je vriend raadt daarna letter voor letter.
        </p>

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

          <input
            className="rounded-2xl border-none bg-paper px-4 py-3 font-bold text-ink-700 outline-none placeholder:text-ink-400/60"
            placeholder="Geheim woord"
            maxLength={24}
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />

          {normalizedWord && (
            <p className="text-sm font-bold opacity-80">
              Clubhuis gebruikt: {normalizedWord}
            </p>
          )}

          {error && <p className="text-sm font-extrabold text-warn-text">{error}</p>}

          <Button
            type="button"
            onClick={createGame}
            disabled={creating || friends.length === 0 || normalizedWord.length < 3}
            className="w-full"
          >
            {creating ? 'Spel maken...' : 'Start Galgje'}
            <ArrowRightIcon width={17} height={17} />
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="font-extrabold text-ink-900">Mijn Galgje-spellen</p>
        <button type="button" onClick={loadGames} className="text-sm font-extrabold text-blue-500">
          Ververs
        </button>
      </div>

      {loading && <Card className="text-center text-ink-400">Spellen laden...</Card>}
      {!loading && games.length === 0 && (
        <Card className="text-center text-ink-400">
          Nog geen Galgje-spellen. Maak hierboven je eerste spel.
        </Card>
      )}
      {!loading && games.map(renderGame)}
    </div>
  )
}
