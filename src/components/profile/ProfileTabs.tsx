import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { AuraPill, CommentPill, PrivatePill } from '@/components/ui/Pill'
import { StoryPhoto } from '@/components/story/StoryPhoto'
import { ContactsPanel } from '@/components/friends/ContactsPanel'
import { ArrowRightIcon, CameraIcon, MoreIcon, PlusIcon } from '@/components/ui/icons'
import { LoadingState } from '@/components/ui/LoadingState'

const MAX_FAVORITES = 20

type Tab = 'verhalen' | 'overmij' | 'krabbels' | 'vrienden' | 'herinneringen'

interface Story {
  id: string
  text: string
  photo_path: string | null
  visibility: string
  created_at: string
  is_favorite: boolean
}

interface Question {
  id: string
  key: string
  label: string
}

interface Answer {
  question_id: string
  answer: string
}

interface Scribble {
  id: string
  author_id: string
  profile_id: string
  text: string
  created_at: string
  parent_id: string | null
  author: { display_name: string } | null
}

interface Comment {
  id: string
  author_id: string
  story_id: string
  text: string
  created_at: string
  profiles: { display_name: string } | null
}

const SCRIBBLE_STYLES = ['bg-scribble-peach text-scribble-peach-text', 'bg-scribble-blue text-scribble-blue-text']
const QUESTION_STYLES = [
  'bg-avatar-blue-bg text-avatar-blue-text',
  'bg-avatar-green-bg text-avatar-green-text',
  'bg-avatar-peach-bg text-avatar-peach-text',
  'bg-avatar-sand-bg text-avatar-sand-text',
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) return 'vandaag'
  if (days === 1) return 'gisteren'
  if (days < 14) return 'vorige week'
  return new Date(iso).toLocaleDateString('nl-NL', { month: 'long' })
}

export function ProfileTabs({ profileId, displayName, isOwn }: { profileId: string; displayName: string; isOwn: boolean }) {
  const { profile: viewer } = useAuth()
  const [tab, setTab] = useState<Tab>('verhalen')
  const [stories, setStories] = useState<Story[] | null>(null)
  const [auraByStory, setAuraByStory] = useState<Record<string, { count: number; mine: boolean; names: string[] }>>({})
  const [commentsByStory, setCommentsByStory] = useState<Record<string, Comment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [scribbles, setScribbles] = useState<Scribble[] | null>(null)
  const [newScribble, setNewScribble] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingScribbleId, setEditingScribbleId] = useState<string | null>(null)
  const [editScribbleText, setEditScribbleText] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tab === 'verhalen' || tab === 'herinneringen') loadStories()
    if (tab === 'overmij') loadVriendenboekje()
    if (tab === 'krabbels') loadScribbles()
  }, [tab, profileId])

  useEffect(() => {
    if (!openMenuId) return
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [openMenuId])

  async function loadStories() {
    setStories(null)
    const { data } = await supabase
      .from('stories')
      .select('id, text, photo_path, visibility, created_at, is_favorite')
      .eq('author_id', profileId)
      .order('created_at', { ascending: false })
    const rows = data ?? []
    setStories(rows)

    if (!rows.length) {
      setAuraByStory({})
      setCommentsByStory({})
      return
    }
    const ids = rows.map((s) => s.id)
    const [{ data: auraRows }, { data: commentRows }] = await Promise.all([
      supabase.from('story_aura').select('story_id, user_id').in('story_id', ids),
      supabase
        .from('story_comments')
        .select('id, author_id, story_id, text, created_at, profiles!story_comments_author_id_fkey(display_name)')
        .in('story_id', ids)
        .order('created_at', { ascending: true }),
    ])
    const giverRows = (auraRows ?? []) as { story_id: string; user_id: string }[]
    const { data: giverProfiles } = giverRows.length
      ? await supabase
          .from('profile_cards')
          .select('id, display_name')
          .in(
            'id',
            [...new Set(giverRows.map((r) => r.user_id))],
          )
      : { data: [] }
    const nameById = new Map((giverProfiles ?? []).map((p) => [p.id, p.display_name ?? 'Iemand']))

    const map: Record<string, { count: number; mine: boolean; names: string[] }> = {}
    for (const row of giverRows) {
      const entry = map[row.story_id] ?? { count: 0, mine: false, names: [] }
      entry.count += 1
      if (row.user_id === viewer?.id) entry.mine = true
      entry.names.push(nameById.get(row.user_id) ?? 'Iemand')
      map[row.story_id] = entry
    }
    setAuraByStory(map)

    const commentMap: Record<string, Comment[]> = {}
    for (const row of (commentRows ?? []) as unknown as Comment[]) {
      ;(commentMap[row.story_id] ??= []).push(row)
    }
    setCommentsByStory(commentMap)
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
    if (!viewer) return
    const text = (commentDrafts[storyId] ?? '').trim()
    if (!text) return
    setCommentDrafts((prev) => ({ ...prev, [storyId]: '' }))
    await supabase.from('story_comments').insert({ story_id: storyId, author_id: viewer.id, text })
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

  async function toggleAura(storyId: string) {
    if (!viewer) return
    const current = auraByStory[storyId] ?? { count: 0, mine: false, names: [] }
    if (current.mine) {
      setAuraByStory((prev) => ({
        ...prev,
        [storyId]: { count: current.count - 1, mine: false, names: current.names.filter((n) => n !== viewer.display_name) },
      }))
      await supabase.from('story_aura').delete().eq('story_id', storyId).eq('user_id', viewer.id)
    } else {
      setAuraByStory((prev) => ({
        ...prev,
        [storyId]: { count: current.count + 1, mine: true, names: [...current.names, viewer.display_name] },
      }))
      await supabase.from('story_aura').insert({ story_id: storyId, user_id: viewer.id })
    }
  }

  async function toggleFavorite(story: Story) {
    const nextValue = !story.is_favorite
    if (nextValue && (stories?.filter((s) => s.is_favorite).length ?? 0) >= MAX_FAVORITES) return

    setStories((prev) => prev?.map((s) => (s.id === story.id ? { ...s, is_favorite: nextValue } : s)) ?? null)
    await supabase.from('stories').update({ is_favorite: nextValue }).eq('id', story.id)
  }

  async function loadVriendenboekje() {
    const [{ data: qData }, { data: aData }] = await Promise.all([
      supabase.from('profile_questions').select('id, key, label').eq('active', true).order('sort_order'),
      supabase.from('profile_answers').select('question_id, answer').eq('profile_id', profileId),
    ])
    setQuestions(qData ?? [])
    setAnswers(aData ?? [])
  }

  async function loadScribbles() {
    setScribbles(null)
    const { data } = await supabase
      .from('scribbles')
      .select('id, author_id, profile_id, text, created_at, parent_id')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
    const rows = data ?? []

    if (!rows.length) {
      setScribbles([])
      return
    }

    // Een krabbel-auteur is een vriend van de plekjeseigenaar, maar niet per se van de
    // kijker (bv. bij het bekijken van een vriend's plekje) — profiles zelf (RLS: eigen
    // rij of vrienden) zou die naam dan verbergen, profile_cards toont elk actief profiel.
    const { data: authorProfiles } = await supabase
      .from('profile_cards')
      .select('id, display_name')
      .in(
        'id',
        [...new Set(rows.map((r) => r.author_id))],
      )
    const byId = new Map((authorProfiles ?? []).map((p) => [p.id, p.display_name]))
    setScribbles(
      rows.map((r) => ({
        ...r,
        author: byId.has(r.author_id) ? { display_name: byId.get(r.author_id) ?? 'Iemand' } : null,
      })),
    )
  }

  async function saveAnswer(questionId: string, value: string) {
    setAnswers((prev) => {
      const next = prev.filter((a) => a.question_id !== questionId)
      return value ? [...next, { question_id: questionId, answer: value }] : next
    })
    if (!value.trim()) return
    await supabase.from('profile_answers').upsert({ profile_id: profileId, question_id: questionId, answer: value.trim() })
  }

  async function sendScribble() {
    if (!viewer || !newScribble.trim()) return
    const text = newScribble.trim()
    setNewScribble('')
    await supabase.from('scribbles').insert({ profile_id: profileId, author_id: viewer.id, text })
    loadScribbles()
  }

  async function sendReply(parentId: string) {
    if (!viewer || !replyText.trim()) return
    const text = replyText.trim()
    setReplyText('')
    setReplyingTo(null)
    await supabase.from('scribbles').insert({ profile_id: profileId, author_id: viewer.id, text, parent_id: parentId })
    loadScribbles()
  }

  const SCRIBBLE_EDIT_WINDOW_MS = 30 * 60 * 1000

  function canEditScribble(s: Scribble) {
    return viewer?.id === s.author_id && Date.now() - new Date(s.created_at).getTime() < SCRIBBLE_EDIT_WINDOW_MS
  }

  function startEditScribble(s: Scribble) {
    setEditingScribbleId(s.id)
    setEditScribbleText(s.text)
    setReplyingTo(null)
  }

  async function saveScribbleEdit(id: string) {
    const trimmed = editScribbleText.trim()
    if (!trimmed) return
    await supabase.from('scribbles').update({ text: trimmed }).eq('id', id)
    setScribbles((prev) => prev?.map((s) => (s.id === id ? { ...s, text: trimmed } : s)) ?? null)
    setEditingScribbleId(null)
  }

  function renderScribbleEditor(id: string) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          className="w-full resize-none rounded-2xl border-none bg-paper/70 p-3 text-ink-900 outline-none"
          rows={2}
          maxLength={500}
          value={editScribbleText}
          onChange={(e) => setEditScribbleText(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <Button onClick={() => saveScribbleEdit(id)} disabled={!editScribbleText.trim()}>
            Opslaan
          </Button>
          <Button variant="muted" onClick={() => setEditingScribbleId(null)}>
            Annuleren
          </Button>
        </div>
      </div>
    )
  }

  function startEdit(story: Story) {
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

  const topLevelScribbles = scribbles?.filter((s) => !s.parent_id) ?? null
  const repliesByParent: Record<string, Scribble[]> = {}
  for (const s of scribbles ?? []) {
    if (s.parent_id) (repliesByParent[s.parent_id] ??= []).push(s)
  }

  const tabOptions: { value: Tab; label: string }[] = [
    { value: 'verhalen', label: 'Verhalen' },
    { value: 'overmij', label: 'Over mij' },
    { value: 'krabbels', label: 'Krabbels' },
  ]
  if (isOwn) {
    tabOptions.push({ value: 'vrienden', label: 'Vrienden' })
    tabOptions.push({ value: 'herinneringen', label: 'Herinneringen' })
  }

  const favoriteCount = stories?.filter((s) => s.is_favorite).length ?? 0
  const favoriteStories = stories?.filter((s) => s.is_favorite) ?? null

  function renderStoryCard(story: Story): ReactNode {
    return (
      <Card key={story.id} className="relative">
        {isOwn && editingId !== story.id && (
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
                {story.is_favorite ? (
                  <button
                    type="button"
                    onClick={() => {
                      toggleFavorite(story)
                      setOpenMenuId(null)
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-ink-700 transition-colors hover:bg-blue-50"
                  >
                    Verwijder uit mooiste herinneringen
                  </button>
                ) : favoriteCount >= MAX_FAVORITES ? (
                  <p className="px-3 py-2 text-left text-sm font-bold text-ink-400">Max. 20 bereikt</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      toggleFavorite(story)
                      setOpenMenuId(null)
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-ink-700 transition-colors hover:bg-blue-50"
                  >
                    Voeg toe aan mooiste herinneringen
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {story.visibility === 'private' ? (
          <PrivatePill time={new Date(story.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} />
        ) : (
          <p className="pr-8 text-xs font-bold text-ink-400">
            {new Date(story.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} · Gedeeld met vrienden
          </p>
        )}

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
                names={auraByStory[story.id]?.names}
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
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs value={tab} onChange={setTab} options={tabOptions} />

      {tab === 'verhalen' && (
        <div className="flex flex-col gap-3">
          {isOwn && (
            <Link to="/vertellen">
              <Button variant="secondary" className="w-full justify-start px-5">
                <PlusIcon width={18} height={18} />
                Verhaal vertellen
              </Button>
            </Link>
          )}

          {stories === null && <LoadingState />}
          {stories?.length === 0 && <Card className="text-center text-ink-400">Nog geen verhalen.</Card>}
          {stories?.map(renderStoryCard)}
        </div>
      )}

      {tab === 'overmij' && (
        <div className="grid grid-cols-2 gap-3">
          {questions.map((q, i) => {
            const answer = answers.find((a) => a.question_id === q.id)?.answer ?? ''
            return (
              <div key={q.id} className={`rounded-card p-4 ${QUESTION_STYLES[i % QUESTION_STYLES.length]}`}>
                <p className="text-xs font-extrabold uppercase tracking-wide opacity-70">{q.label}</p>
                {isOwn ? (
                  <input
                    className="font-hand mt-1 w-full bg-transparent text-xl leading-snug outline-none placeholder:font-sans placeholder:text-sm placeholder:font-semibold placeholder:opacity-60"
                    placeholder="Nog niet ingevuld"
                    defaultValue={answer}
                    onBlur={(e) => saveAnswer(q.id, e.target.value)}
                  />
                ) : (
                  <p className="font-hand mt-1 text-xl leading-snug">{answer || '—'}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'krabbels' && (
        <div className="flex flex-col gap-3">
          {!isOwn && (
            <div className="flex items-center gap-2 rounded-card bg-paper p-2 shadow-softer">
              <input
                className="font-hand w-full bg-transparent px-3 text-xl text-ink-700 outline-none placeholder:text-ink-400/60"
                placeholder={`Schrijf een krabbel voor ${displayName}...`}
                value={newScribble}
                onChange={(e) => setNewScribble(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendScribble()}
              />
              <button
                type="button"
                onClick={sendScribble}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-squircle bg-blue-500 text-paper"
                aria-label="Verstuur krabbel"
              >
                <ArrowRightIcon width={18} height={18} />
              </button>
            </div>
          )}

          {scribbles === null && <LoadingState />}
          {topLevelScribbles?.length === 0 && <Card className="text-center text-ink-400">Nog geen krabbels.</Card>}
          {topLevelScribbles
            ?.slice()
            .reverse()
            .map((s, i) => (
              <div key={s.id} className={`rounded-card p-5 ${SCRIBBLE_STYLES[i % SCRIBBLE_STYLES.length]}`}>
                {editingScribbleId === s.id ? (
                  renderScribbleEditor(s.id)
                ) : (
                  <>
                    <p className="font-hand text-2xl leading-snug">{s.text}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-sm font-extrabold opacity-80">
                        {s.author?.display_name ?? 'Iemand'} · {timeAgo(s.created_at)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(replyingTo === s.id ? null : s.id)}
                        className="text-sm font-extrabold underline opacity-80"
                      >
                        Reageren
                      </button>
                      {canEditScribble(s) && (
                        <button
                          type="button"
                          onClick={() => startEditScribble(s)}
                          className="text-sm font-extrabold underline opacity-80"
                        >
                          Bewerken
                        </button>
                      )}
                    </div>
                  </>
                )}

                {(repliesByParent[s.id] ?? []).map((r) => (
                  <div key={r.id} className="ml-4 mt-3 rounded-2xl bg-paper/60 p-3">
                    {editingScribbleId === r.id ? (
                      renderScribbleEditor(r.id)
                    ) : (
                      <>
                        <p className="text-ink-700">{r.text}</p>
                        <div className="mt-1 flex items-center gap-3">
                          <p className="text-xs font-bold opacity-70">
                            {r.author?.display_name ?? 'Iemand'} · {timeAgo(r.created_at)}
                          </p>
                          {canEditScribble(r) && (
                            <button
                              type="button"
                              onClick={() => startEditScribble(r)}
                              className="text-xs font-bold underline opacity-70"
                            >
                              Bewerken
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {replyingTo === s.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      className="w-full rounded-full bg-paper/70 px-4 py-2 text-ink-700 outline-none placeholder:text-ink-400/60"
                      placeholder="Schrijf een reactie..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendReply(s.id)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => sendReply(s.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-paper"
                      aria-label="Verstuur reactie"
                    >
                      <ArrowRightIcon width={16} height={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {tab === 'vrienden' && <ContactsPanel />}

      {tab === 'herinneringen' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-extrabold text-ink-900">Mijn mooiste herinneringen</p>
            <p className="text-sm font-bold text-ink-400">
              {favoriteCount} van {MAX_FAVORITES}
            </p>
          </div>

          {stories === null && <LoadingState />}
          {favoriteStories?.length === 0 && (
            <Card className="text-center text-ink-400">
              Nog geen herinneringen gekozen — markeer een verhaal via de puntjes bij "Verhalen".
            </Card>
          )}
          {favoriteStories?.map(renderStoryCard)}
        </div>
      )}
    </div>
  )
}

export function AvatarHeader({
  displayName,
  username,
  avatarPath,
  statusMessage,
  onPhotoChange,
  photoBusy,
}: {
  displayName: string
  username: string
  avatarPath?: string | null
  /** Kort zelfgekozen zinnetje, getoond naast de naam in een ander lettertype. */
  statusMessage?: string | null
  /** Alleen op de eigen pagina: toont een bewerk-badge waarmee een nieuwe foto gekozen kan worden. */
  onPhotoChange?: (file: File) => void
  photoBusy?: boolean
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <Avatar name={displayName} avatarPath={avatarPath} size={64} />
        {onPhotoChange && (
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-cream bg-blue-500 text-paper transition-transform active:scale-95">
            <CameraIcon width={13} height={13} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={photoBusy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) onPhotoChange(file)
              }}
            />
          </label>
        )}
      </div>
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h1 className="text-2xl font-extrabold text-ink-900">{displayName}</h1>
          {statusMessage && <span className="font-hand text-xl text-ink-400">{statusMessage}</span>}
        </div>
        <p className="text-sm font-semibold text-ink-400">@{username}</p>
      </div>
    </div>
  )
}
