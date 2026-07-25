import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { BigTitle } from '@/components/layout/PageHeader'
import { SearchIcon } from '@/components/ui/icons'

interface ProfileCard {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

interface IncomingRequest {
  id: string
  requester_id: string
  profiles: { username: string; display_name: string } | null
}

export function Friends() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProfileCard[]>([])
  const [searching, setSearching] = useState(false)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [incoming, setIncoming] = useState<IncomingRequest[]>([])
  const [friends, setFriends] = useState<{ id: string; display_name: string; username: string }[]>([])

  useEffect(() => {
    if (profile) {
      loadIncoming()
      loadFriends()
    }
  }, [profile])

  async function loadIncoming() {
    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, profiles!friendships_requester_id_fkey(username, display_name)')
      .eq('status', 'pending')
      .eq('addressee_id', profile?.id ?? '')
    setIncoming((data as unknown as IncomingRequest[]) ?? [])
  }

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select(
        'requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, username, display_name), addressee:profiles!friendships_addressee_id_fkey(id, username, display_name)',
      )
      .eq('status', 'accepted')
      .or(`requester_id.eq.${profile?.id},addressee_id.eq.${profile?.id}`)

    const rows = (data ?? []) as unknown as {
      requester_id: string
      requester: { id: string; username: string; display_name: string } | null
      addressee: { id: string; username: string; display_name: string } | null
    }[]

    setFriends(
      rows
        .map((row) => (row.requester_id === profile?.id ? row.addressee : row.requester))
        .filter((f): f is { id: string; username: string; display_name: string } => f !== null),
    )
  }

  // Live zoeken terwijl je typt (met een korte pauze) in plaats van pas na Enter: anders
  // lijkt het scherm het simpelweg niet te doen, zonder zichtbare zoekknop.
  useEffect(() => {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profile_cards')
        .select('*')
        .ilike('username', `%${trimmed}%`)
        .neq('id', profile?.id ?? '')
        .limit(15)
      // profile_cards is een view op profiles (id/username/display_name zijn daar NOT NULL);
      // Supabase's codegen markeert view-kolommen desondanks als nullable.
      setResults((data ?? []) as ProfileCard[])
      setSearching(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, profile?.id])

  async function sendRequest(addresseeId: string) {
    if (!profile) return
    const { error } = await supabase.from('friendships').insert({ requester_id: profile.id, addressee_id: addresseeId })
    if (!error) setSentTo((prev) => new Set(prev).add(addresseeId))
  }

  async function respond(requestId: string, status: 'accepted' | 'declined') {
    await supabase.from('friendships').update({ status }).eq('id', requestId)
    setIncoming((prev) => prev.filter((r) => r.id !== requestId))
    if (status === 'accepted') loadFriends()
  }

  return (
    <div className="flex flex-col gap-5">
      <BigTitle>Vrienden</BigTitle>

      <div className="flex items-center gap-2 rounded-pill bg-paper px-4 py-3 shadow-softer">
        <SearchIcon width={18} height={18} className="text-ink-400" />
        <input
          className="w-full bg-transparent text-ink-700 outline-none placeholder:text-ink-400/60"
          placeholder="Zoek op gebruikersnaam"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {incoming.map((req) => (
        <div key={req.id} className="rounded-card bg-blue-100 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-500">1 verzoek</p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={req.profiles?.display_name ?? '?'} size={44} />
            <div>
              <p className="font-extrabold text-ink-900">{req.profiles?.display_name}</p>
              <p className="text-sm font-semibold text-ink-400">@{req.profiles?.username}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => respond(req.id, 'accepted')}>Accepteren</Button>
            <Button variant="secondary" onClick={() => respond(req.id, 'declined')}>
              Weigeren
            </Button>
          </div>
        </div>
      ))}

      {query.trim().length >= 2 && (
        <div className="flex flex-col gap-2.5">
          {searching && <p className="text-sm text-ink-400">Even zoeken...</p>}
          {!searching && results.length === 0 && (
            <Card className="text-center text-ink-400">Niemand gevonden met die gebruikersnaam.</Card>
          )}
          {results.map((r) => (
            <Card key={r.id} className="flex items-center gap-3">
              <Avatar name={r.display_name} size={44} />
              <div className="flex-1">
                <p className="font-extrabold text-ink-900">{r.display_name}</p>
                <p className="text-sm font-semibold text-ink-400">@{r.username}</p>
              </div>
              <Button variant={sentTo.has(r.id) ? 'muted' : 'secondary'} disabled={sentTo.has(r.id)} onClick={() => sendRequest(r.id)}>
                {sentTo.has(r.id) ? 'Verzonden' : 'Vriendschapsverzoek sturen'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm font-extrabold uppercase tracking-wide text-ink-400">Mijn {friends.length} vrienden</p>
      <div className="flex flex-col gap-2.5">
        {friends.length === 0 && <Card className="text-center text-ink-400">Nog geen vrienden — zoek iemand hierboven.</Card>}
        {friends.map((friend) => (
          <Link key={friend.id} to={`/vrienden/${friend.username}`}>
            <Card className="flex items-center gap-3">
              <Avatar name={friend.display_name} size={44} />
              <div className="flex-1">
                <p className="font-extrabold text-ink-900">{friend.display_name}</p>
              </div>
              <p className="text-sm font-semibold text-ink-400">@{friend.username}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
