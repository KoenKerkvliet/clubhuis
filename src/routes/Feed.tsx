import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { BigTitle } from '@/components/layout/PageHeader'
import { AuraPill, CommentPill } from '@/components/ui/Pill'
import { StoryPhoto } from '@/components/story/StoryPhoto'
import { ArrowRightIcon, MoreIcon } from '@/components/ui/icons'

const PAGE_SIZE = 20

interface FeedStory {
  id: string
  text: string
  photo_path: string | null
  visibility: string
  created_at: string
  author_id: string
  profiles: { username: string; display_name: string; avatar_url: string | null } | null
}

interface Comment {
  id: string
  author_id: string
  story_id: string
  text: string
  created_at: string
  profiles: { display_name: string } | null
}

interface IncomingRequest {
  id: string
  requester_id: string
  profiles: { username: string; display_name: string; avatar_url: string | null } | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export function Feed() {
  const { profile } = useAuth()
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [stories, setStories] = useState<FeedStory[] | null>(null)
  const [auraByStory, setAuraByStory] = useState<Record<string, { count: number; mine: boolean }>>({})
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [commentsByStory, setCommentsByStory] = useState<Record<string, Comment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [incoming, setIncoming] = useState<IncomingRequest[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (profile) loadIncoming()
  }, [profile])

  useEffect(() => {
    if (profile) loadFeed()
  }, [page, profile])

  useEffect(() => {
    if (!openMenuId) return
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [openMenuId])

  async function loadFeed() {
    if (!profile) return
    setStories(null)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, count } = await supabase
      .from('stories')
      .select(
        'id, text, photo_path, visibility, created_at, author_id, profiles!stories_author_id_fkey(username, display_name, avatar_url)',
        { count: 'exact' },
      )
      .eq('visibility', 'friends')
      .order('created_at', { ascending: false })
      .range(from, to)
    const rows = (data as unknown as FeedStory[]) ?? []
    setStories(rows)
    setTotalCount(count ?? 0)

    if (!rows.length) {
      setAuraByStory({})
      setHiddenIds(new Set())
      setCommentsByStory({})
      return
    }
    const ids = rows.map((r) => r.id)

    const [{ data: auraRows }, { data: hiddenRows }, { data: commentRows }] = await Promise.all([
      supabase.from('story_aura').select('story_id, user_id').in('story_id', ids),
      supabase.from('hidden_stories').select('story_id').eq('user_id', profile.id).in('story_id', ids),
      supabase
        .from('story_comments')
        .select('id, author_id, story_id, text, created_at, profiles!story_comments_author_id_fkey(display_name)')
        .in('story_id', ids)
        .order('created_at', { ascending: true }),
    ])

    const auraMap: Record<string, { count: number; mine: boolean }> = {}
    for (const row of (auraRows ?? []) as { story_id: string; user_id: string }[]) {
      const entry = auraMap[row.story_id] ?? { count: 0, mine: false }
      entry.count += 1
      if (row.user_id === profile.id) entry.mine = true
      auraMap[row.story_id] = entry
    }
    setAuraByStory(auraMap)

    setHiddenIds(new Set((hiddenRows ?? []).map((r) => r.story_id)))

    const commentMap: Record<string, Comment[]> = {}
    for (const row of (commentRows ?? []) as unknown as Comment[]) {
      ;(commentMap[row.story_id] ??= []).push(row)
    }
    setCommentsByStory(commentMap)
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

  async function hideStory(storyId: string) {
    if (!profile) return
    setHiddenIds((prev) => new Set(prev).add(storyId))
    await supabase.from('hidden_stories').insert({ story_id: storyId, user_id: profile.id })
  }

  async function unhideStory(storyId: string) {
    if (!profile) return
    setHiddenIds((prev) => {
      const next = new Set(prev)
      next.delete(storyId)
      return next
    })
    await supabase.from('hidden_stories').delete().eq('story_id', storyId).eq('user_id', profile.id)
  }

  async function refreshComments(storyId: string) {
    const { data } = await supabase
      .from('story_comments')
      .select('id, author_id, story_id, text, created_at, profiles!story_comments_author_id_fkey(display_name)')
      .eq('story_id', storyId)
      .order('created_at', { ascending: true })
    setCommentsByStory((prev) => ({ ...prev, [storyId]: (data as unknown as Comment[]) ?? [] }))
  }

  async function sendComment(storyId: string) {
    if (!profile) return
    const text = (commentDrafts[storyId] ?? '').trim()
    if (!text) return
    setCommentDrafts((prev) => ({ ...prev, [storyId]: '' }))
    await supabase.from('story_comments').insert({ story_id: storyId, author_id: profile.id, text })
    refreshComments(storyId)
  }

  function toggleComments(storyId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev)
      if (next.has(storyId)) next.delete(storyId)
      else next.add(storyId)
      return next
    })
  }

  function startEdit(story: FeedStory) {
    setEditingId(story.id)
    setEditText(story.text)
  }

  async function saveEdit(id: string) {
    const trimmed = editText.trim()
    if (!trimmed) return
    await supabase.from('stories').update({ text: trimmed }).eq('id', id)
    setStories((prev) => prev?.map((s) => (s.id === id ? { ...s, text: trimmed } : s)) ?? null)
    setEditingId(null)
  }

  async function deleteStory(id: string) {
    const story = stories?.find((s) => s.id === id)
    if (story?.photo_path) {
      await supabase.storage.from('story-photos').remove([story.photo_path])
    }
    await supabase.from('stories').delete().eq('id', id)
    setStories((prev) => prev?.filter((s) => s.id !== id) ?? null)
    setConfirmingDeleteId(null)
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-5">
      <BigTitle>Verhalen</BigTitle>

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

      <div className="flex flex-col gap-4">
        {stories === null && <p className="text-sm text-ink-400">Even ophalen...</p>}

        {stories?.length === 0 && (
          <Card className="text-center text-ink-400">
            <p>Hier komen straks de verhalen van je vrienden.</p>
          </Card>
        )}

        {stories?.map((story) => {
          const isOwn = story.author_id === profile?.id

          if (hiddenIds.has(story.id)) {
            return (
              <Card key={story.id} className="flex items-center justify-between gap-3 bg-neutral-badge">
                <p className="text-sm font-semibold text-ink-500">
                  Bericht van {story.profiles?.display_name ?? 'iemand'} is verborgen.
                </p>
                <button
                  type="button"
                  onClick={() => unhideStory(story.id)}
                  className="shrink-0 text-sm font-extrabold text-blue-500"
                >
                  Toon weer
                </button>
              </Card>
            )
          }

          return (
            <Card key={story.id} className="relative">
              {editingId !== story.id && (
                <div className="absolute right-3 top-3" ref={openMenuId === story.id ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === story.id ? null : story.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-blue-50"
                    aria-label="Opties voor dit bericht"
                  >
                    <MoreIcon width={18} height={18} />
                  </button>
                  {openMenuId === story.id && (
                    <div className="absolute right-0 top-9 z-10 w-40 rounded-card bg-paper p-1.5 shadow-soft">
                      {isOwn ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              startEdit(story)
                              setOpenMenuId(null)
                            }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-ink-700 transition-colors hover:bg-blue-50"
                          >
                            Bewerken
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingDeleteId(story.id)
                              setOpenMenuId(null)
                            }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-warn-text transition-colors hover:bg-warn-bg"
                          >
                            Verwijderen
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            hideStory(story.id)
                            setOpenMenuId(null)
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-ink-700 transition-colors hover:bg-blue-50"
                        >
                          Verbergen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pr-8">
                <Avatar name={story.profiles?.display_name ?? '?'} avatarPath={story.profiles?.avatar_url} size={40} />
                <div>
                  <p className="font-extrabold text-ink-900">{story.profiles?.display_name ?? 'Onbekend'}</p>
                  <p className="text-xs font-semibold text-ink-400">{formatTime(story.created_at)}</p>
                </div>
              </div>

              {editingId === story.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    className="w-full resize-none rounded-2xl border border-blue-200 bg-paper p-3 text-ink-700 outline-none focus:border-blue-400"
                    rows={3}
                    maxLength={2000}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(story.id)} disabled={!editText.trim()}>
                      Opslaan
                    </Button>
                    <Button variant="muted" onClick={() => setEditingId(null)}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-ink-700">{story.text}</p>
                  {story.photo_path && <StoryPhoto path={story.photo_path} />}
                  <div className="mt-4 flex items-center gap-2">
                    <AuraPill
                      count={auraByStory[story.id]?.count ?? 0}
                      active={auraByStory[story.id]?.mine}
                      onClick={isOwn ? undefined : () => toggleAura(story.id)}
                    />
                    <CommentPill count={commentsByStory[story.id]?.length ?? 0} onClick={() => toggleComments(story.id)} />
                  </div>
                </>
              )}

              {isOwn && confirmingDeleteId === story.id && (
                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-warn-text">
                  Verwijderen?
                  <button type="button" onClick={() => deleteStory(story.id)} className="font-extrabold underline">
                    Ja
                  </button>
                  <button type="button" onClick={() => setConfirmingDeleteId(null)} className="font-extrabold">
                    Nee
                  </button>
                </div>
              )}

              {expandedComments.has(story.id) && editingId !== story.id && (
                <div className="mt-4 flex flex-col gap-3 border-t border-blue-100/70 pt-4">
                  {(commentsByStory[story.id] ?? []).map((c) => (
                    <p key={c.id} className="text-sm text-ink-700">
                      <span className="font-extrabold text-ink-900">{c.profiles?.display_name ?? 'Iemand'}</span> {c.text}
                    </p>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-full bg-cream px-4 py-2 text-ink-700 outline-none placeholder:text-ink-400/60"
                      placeholder="Schrijf een reactie..."
                      value={commentDrafts[story.id] ?? ''}
                      onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [story.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && sendComment(story.id)}
                    />
                    <button
                      type="button"
                      onClick={() => sendComment(story.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-paper"
                      aria-label="Verstuur reactie"
                    >
                      <ArrowRightIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Vorige
          </Button>
          <p className="text-sm font-bold text-ink-400">
            Pagina {page + 1} van {totalPages}
          </p>
          <Button variant="secondary" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Volgende
          </Button>
        </div>
      )}
    </div>
  )
}
