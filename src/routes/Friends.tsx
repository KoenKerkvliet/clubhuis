import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { BigTitle } from '@/components/layout/PageHeader'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { AuraPill, CommentPill } from '@/components/ui/Pill'
import { StoryPhoto } from '@/components/story/StoryPhoto'
import { ContactsPanel } from '@/components/friends/ContactsPanel'

type Tab = 'feed' | 'contacten'

interface FeedStory {
  id: string
  text: string
  photo_path: string | null
  created_at: string
  author_id: string
  profiles: { username: string; display_name: string; avatar_url: string | null } | null
}

interface IncomingRequest {
  id: string
  requester_id: string
  profiles: { username: string; display_name: string; avatar_url: string | null } | null
}

export function Friends() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'contacten' ? 'contacten' : 'feed')
  const [stories, setStories] = useState<FeedStory[] | null>(null)
  const [auraByStory, setAuraByStory] = useState<Record<string, { count: number; mine: boolean }>>({})
  const [incoming, setIncoming] = useState<IncomingRequest[]>([])

  useEffect(() => {
    if (profile) loadIncoming()
  }, [profile])

  useEffect(() => {
    if (tab === 'feed') loadFeed()
  }, [tab, profile])

  async function loadFeed() {
    setStories(null)
    const { data } = await supabase
      .from('stories')
      .select(
        'id, text, photo_path, created_at, author_id, profiles!stories_author_id_fkey(username, display_name, avatar_url)',
      )
      .eq('visibility', 'friends')
      .order('created_at', { ascending: false })
      .limit(20)
    const rows = (data as unknown as FeedStory[]) ?? []
    setStories(rows)

    if (!rows.length) {
      setAuraByStory({})
      return
    }
    const { data: auraRows } = await supabase
      .from('story_aura')
      .select('story_id, user_id')
      .in(
        'story_id',
        rows.map((r) => r.id),
      )
    const map: Record<string, { count: number; mine: boolean }> = {}
    for (const row of (auraRows ?? []) as { story_id: string; user_id: string }[]) {
      const entry = map[row.story_id] ?? { count: 0, mine: false }
      entry.count += 1
      if (row.user_id === profile?.id) entry.mine = true
      map[row.story_id] = entry
    }
    setAuraByStory(map)
  }

  async function toggleAura(storyId: string) {
    if (!profile) return
    const current = auraByStory[storyId] ?? { count: 0, mine: false }
    if (current.mine) {
      setAuraByStory((prev) => ({ ...prev, [storyId]: { count: current.count - 1, mine: false } }))
      await supabase.from('story_aura').delete().eq('story_id', storyId).eq('user_id', profile.id)
    } else {
      setAuraByStory((prev) => ({ ...prev, [storyId]: { count: current.count + 1, mine: true } }))
      await supabase.from('story_aura').insert({ story_id: storyId, user_id: profile.id })
    }
  }

  async function loadIncoming() {
    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, profiles!friendships_requester_id_fkey(username, display_name, avatar_url)')
      .eq('status', 'pending')
      .eq('addressee_id', profile?.id ?? '')
    setIncoming((data as unknown as IncomingRequest[]) ?? [])
  }

  async function respond(requestId: string, status: 'accepted' | 'declined') {
    await supabase.from('friendships').update({ status }).eq('id', requestId)
    setIncoming((prev) => prev.filter((r) => r.id !== requestId))
  }

  return (
    <div className="flex flex-col gap-5">
      <BigTitle>Vrienden</BigTitle>

      {incoming.map((req) => (
        <div key={req.id} className="rounded-card bg-blue-100 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-500">1 verzoek</p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={req.profiles?.display_name ?? '?'} avatarPath={req.profiles?.avatar_url} size={44} />
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

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'feed', label: 'Feed' },
          { value: 'contacten', label: 'Contacten' },
        ]}
      />

      {tab === 'feed' && (
        <div className="flex flex-col gap-4">
          {stories === null && <p className="text-sm text-ink-400">Even ophalen...</p>}

          {stories?.length === 0 && (
            <Card className="text-center text-ink-400">
              <p>Hier komen straks de verhalen van je vrienden.</p>
            </Card>
          )}

          {stories?.map((story) => (
            <Card key={story.id}>
              <div className="flex items-center gap-3">
                <Avatar name={story.profiles?.display_name ?? '?'} avatarPath={story.profiles?.avatar_url} size={40} />
                <div>
                  <p className="font-extrabold text-ink-900">{story.profiles?.display_name ?? 'Onbekend'}</p>
                  <p className="text-xs font-semibold text-ink-400">
                    {new Date(story.created_at).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-ink-700">{story.text}</p>
              {story.photo_path && <StoryPhoto path={story.photo_path} />}
              <div className="mt-4 flex items-center gap-2">
                <AuraPill
                  count={auraByStory[story.id]?.count ?? 0}
                  active={auraByStory[story.id]?.mine}
                  onClick={() => toggleAura(story.id)}
                />
                <CommentPill count={0} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'contacten' && <ContactsPanel />}
    </div>
  )
}
