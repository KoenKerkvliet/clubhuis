import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'

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
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [incoming, setIncoming] = useState<IncomingRequest[]>([])

  useEffect(() => {
    loadIncoming()
  }, [])

  async function loadIncoming() {
    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, profiles!friendships_requester_id_fkey(username, display_name)')
      .eq('status', 'pending')
      .eq('addressee_id', profile?.id ?? '')
    setIncoming((data as unknown as IncomingRequest[]) ?? [])
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const { data } = await supabase
      .from('profile_cards')
      .select('*')
      .ilike('username', `%${query.trim().toLowerCase()}%`)
      .neq('id', profile?.id ?? '')
      .limit(15)
    // profile_cards is een view op profiles (id/username/display_name zijn daar NOT NULL);
    // Supabase's codegen markeert view-kolommen desondanks als nullable.
    setResults((data ?? []) as ProfileCard[])
  }

  async function sendRequest(addresseeId: string) {
    if (!profile) return
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: profile.id, addressee_id: addresseeId })
    if (!error) setSentTo((prev) => new Set(prev).add(addresseeId))
  }

  async function respond(requestId: string, status: 'accepted' | 'declined') {
    await supabase.from('friendships').update({ status }).eq('id', requestId)
    setIncoming((prev) => prev.filter((r) => r.id !== requestId))
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink-700">Vrienden</h1>

      <form onSubmit={handleSearch} className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            id="search"
            label="Zoek op gebruikersnaam"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Zoek
        </Button>
      </form>

      {incoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink-500">Nieuwe verzoeken</h2>
          {incoming.map((req) => (
            <Card key={req.id} className="flex items-center justify-between">
              <span className="font-medium text-ink-700">{req.profiles?.display_name}</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => respond(req.id, 'accepted')}>
                  Accepteren
                </Button>
                <Button variant="ghost" onClick={() => respond(req.id, 'declined')}>
                  Weigeren
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <Card key={r.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink-700">{r.display_name}</p>
              <p className="text-sm text-ink-500">@{r.username}</p>
            </div>
            <Button
              variant="secondary"
              disabled={sentTo.has(r.id)}
              onClick={() => sendRequest(r.id)}
            >
              {sentTo.has(r.id) ? 'Verzonden' : 'Vriendschapsverzoek sturen'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
