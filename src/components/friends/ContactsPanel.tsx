import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { SearchIcon } from '@/components/ui/icons'

interface ProfileCard {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

interface FriendRow {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
}

/** Zoekbalk voor nieuwe vrienden + de lijst van bestaande connecties. Gebruikt op de
 * Vrienden-pagina (tab "Contacten") en op de eigen Ik-pagina (tab "Vrienden"). */
export function ContactsPanel() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProfileCard[]>([])
  const [searching, setSearching] = useState(false)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [sendError, setSendError] = useState<string | null>(null)
  const [friends, setFriends] = useState<FriendRow[]>([])
  // Iedereen met wie al een vriendschap bestaat of een verzoek open staat (in beide
  // richtingen) — die hoort niet meer als zoekresultaat op te duiken.
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (profile) loadFriends()
  }, [profile])

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select(
        'requester_id, addressee_id, status, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url)',
      )
      .in('status', ['accepted', 'pending'])
      .or(`requester_id.eq.${profile?.id},addressee_id.eq.${profile?.id}`)

    const rows = (data ?? []) as unknown as {
      requester_id: string
      addressee_id: string
      status: string
      requester: FriendRow | null
      addressee: FriendRow | null
    }[]

    setFriends(
      rows
        .filter((row) => row.status === 'accepted')
        .map((row) => (row.requester_id === profile?.id ? row.addressee : row.requester))
        .filter((f): f is FriendRow => f !== null),
    )
    setConnectedIds(new Set(rows.map((row) => (row.requester_id === profile?.id ? row.addressee_id : row.requester_id))))
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
    setSendError(null)
    const { error } = await supabase.from('friendships').insert({ requester_id: profile.id, addressee_id: addresseeId })
    if (!error) {
      setSentTo((prev) => new Set(prev).add(addresseeId))
      return
    }
    // Kan gebeuren als de ander net (vlak voor dit verzoek) zelf ook al een verzoek stuurde —
    // dan bestaat de verbinding al en herlaadt de lijst zodat deze persoon verdwijnt.
    setSendError('Jullie hebben al een verbinding met elkaar.')
    loadFriends()
  }

  const visibleResults = results.filter((r) => !connectedIds.has(r.id))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 rounded-pill bg-paper px-4 py-3 shadow-softer">
        <SearchIcon width={18} height={18} className="text-ink-400" />
        <input
          className="w-full bg-transparent text-ink-700 outline-none placeholder:text-ink-400/60"
          placeholder="Zoek op gebruikersnaam"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="flex flex-col gap-2.5">
          {sendError && <p className="text-sm font-semibold text-warn-text">{sendError}</p>}
          {searching && <p className="text-sm text-ink-400">Even zoeken...</p>}
          {!searching && visibleResults.length === 0 && (
            <Card className="text-center text-ink-400">Niemand gevonden met die gebruikersnaam.</Card>
          )}
          {visibleResults.map((r) => (
            <Card key={r.id} className="flex items-center gap-3">
              <Avatar name={r.display_name} avatarPath={r.avatar_url} size={44} />
              <div className="flex-1">
                <p className="font-extrabold text-ink-900">{r.display_name}</p>
                <p className="text-sm font-semibold text-ink-400">@{r.username}</p>
              </div>
              <Button
                variant={sentTo.has(r.id) ? 'muted' : 'secondary'}
                disabled={sentTo.has(r.id)}
                onClick={() => sendRequest(r.id)}
              >
                {sentTo.has(r.id) ? 'Verzonden' : 'Vriendschapsverzoek sturen'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm font-extrabold uppercase tracking-wide text-ink-400">Mijn {friends.length} vrienden</p>
      <div className="flex flex-col gap-2.5">
        {friends.length === 0 && (
          <Card className="text-center text-ink-400">Nog geen vrienden — zoek iemand hierboven.</Card>
        )}
        {friends.map((friend) => (
          <Link key={friend.id} to={`/verhalen/${friend.username}`}>
            <Card className="flex items-center gap-3">
              <Avatar name={friend.display_name} avatarPath={friend.avatar_url} size={44} />
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
