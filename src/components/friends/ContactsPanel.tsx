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

interface PendingRow {
  friendshipId: string
  direction: 'incoming' | 'outgoing'
  profile: FriendRow
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
  const [pending, setPending] = useState<PendingRow[]>([])
  // Iedereen met wie al een vriendschap bestaat of een verzoek open staat (in beide
  // richtingen) — die hoort niet meer als zoekresultaat op te duiken.
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (profile) loadFriends()
  }, [profile])

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .in('status', ['accepted', 'pending'])
      .or(`requester_id.eq.${profile?.id},addressee_id.eq.${profile?.id}`)

    const rows = (data ?? []) as { id: string; requester_id: string; addressee_id: string; status: string }[]

    // De ander in een pending rij is per definitie nog geen vriend, dus profiles zelf (RLS:
    // eigen rij of vrienden) toont die dan niet — profile_cards is wel zichtbaar voor elk
    // actief profiel, dus die halen we apart op en mappen we zelf terug.
    const otherIds = [...new Set(rows.map((row) => (row.requester_id === profile?.id ? row.addressee_id : row.requester_id)))]
    const { data: otherProfiles } = otherIds.length
      ? await supabase.from('profile_cards').select('id, username, display_name, avatar_url').in('id', otherIds)
      : { data: [] }
    const byId = new Map((otherProfiles ?? []).map((p) => [p.id, p as FriendRow]))

    setFriends(
      rows
        .filter((row) => row.status === 'accepted')
        .map((row) => byId.get(row.requester_id === profile?.id ? row.addressee_id : row.requester_id))
        .filter((f): f is FriendRow => f !== undefined),
    )
    setConnectedIds(new Set(otherIds))

    // Zonder dit zag je iemand simpelweg verdwijnen uit de zoekresultaten zodra er al een
    // verzoek open stond, zonder enige uitleg waarom — nu staat het openstaande verzoek
    // hier zichtbaar, met accepteren/weigeren voor een verzoek dat jij ontving.
    setPending(
      rows
        .filter((row) => row.status === 'pending')
        .map((row) => {
          const outgoing = row.requester_id === profile?.id
          const other = byId.get(outgoing ? row.addressee_id : row.requester_id)
          return other ? { friendshipId: row.id, direction: outgoing ? ('outgoing' as const) : ('incoming' as const), profile: other } : null
        })
        .filter((p): p is PendingRow => p !== null),
    )
  }

  async function respondToPending(friendshipId: string, status: 'accepted' | 'declined') {
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    // Anders blijft de bijbehorende melding op de Meldingen-pagina staan met
    // Accepteren/Weigeren, ook al is dit verzoek hier al afgehandeld.
    await supabase.from('notifications').delete().eq('type', 'friend_request').eq('payload->>friendship_id', friendshipId)
    loadFriends()
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

      {pending.length > 0 && (
        <>
          <p className="text-sm font-extrabold uppercase tracking-wide text-ink-400">Openstaande verzoeken</p>
          <div className="flex flex-col gap-2.5">
            {pending.map((p) => (
              <Card key={p.friendshipId} className="flex items-center gap-3">
                <Avatar name={p.profile.display_name} avatarPath={p.profile.avatar_url} size={44} />
                <div className="flex-1">
                  <p className="font-extrabold text-ink-900">{p.profile.display_name}</p>
                  <p className="text-sm font-semibold text-ink-400">@{p.profile.username}</p>
                </div>
                {p.direction === 'outgoing' ? (
                  <span className="text-sm font-bold text-ink-400">In afwachting</span>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={() => respondToPending(p.friendshipId, 'accepted')}>Accepteren</Button>
                    <Button variant="muted" onClick={() => respondToPending(p.friendshipId, 'declined')}>
                      Weigeren
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
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
