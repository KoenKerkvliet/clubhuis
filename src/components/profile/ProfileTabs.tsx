import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { PrivatePill } from '@/components/ui/Pill'
import { StoryPhoto } from '@/components/story/StoryPhoto'
import { ArrowRightIcon, CameraIcon } from '@/components/ui/icons'

type Tab = 'verhalen' | 'vriendenboekje' | 'krabbels'

interface Story {
  id: string
  text: string
  photo_path: string | null
  visibility: string
  created_at: string
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
  author: { display_name: string } | null
}

const SCRIBBLE_STYLES = ['bg-scribble-peach text-scribble-peach-text', 'bg-scribble-blue text-scribble-blue-text']

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [scribbles, setScribbles] = useState<Scribble[] | null>(null)
  const [newScribble, setNewScribble] = useState('')

  useEffect(() => {
    if (tab === 'verhalen') loadStories()
    if (tab === 'vriendenboekje') loadVriendenboekje()
    if (tab === 'krabbels') loadScribbles()
  }, [tab, profileId])

  async function loadStories() {
    setStories(null)
    const { data } = await supabase
      .from('stories')
      .select('id, text, photo_path, visibility, created_at')
      .eq('author_id', profileId)
      .order('created_at', { ascending: false })
    setStories(data ?? [])
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
      .select('id, author_id, profile_id, text, created_at, author:profiles!scribbles_author_id_fkey(display_name)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
    setScribbles((data as unknown as Scribble[]) ?? [])
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

  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'verhalen', label: 'Verhalen' },
          { value: 'vriendenboekje', label: 'Vriendenboekje' },
          { value: 'krabbels', label: 'Krabbels' },
        ]}
      />

      {tab === 'verhalen' && (
        <div className="flex flex-col gap-3">
          {stories === null && <p className="text-sm text-ink-400">Even ophalen...</p>}
          {stories?.length === 0 && <Card className="text-center text-ink-400">Nog geen verhalen.</Card>}
          {stories?.map((story) => (
            <Card key={story.id}>
              {story.visibility === 'private' ? (
                <PrivatePill time={new Date(story.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} />
              ) : (
                <p className="text-xs font-bold text-ink-400">
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
                </>
              )}

              {isOwn && editingId !== story.id && (
                <div className="mt-3 flex gap-4">
                  <button
                    type="button"
                    onClick={() => startEdit(story)}
                    className="text-sm font-extrabold text-blue-500"
                  >
                    Bewerken
                  </button>
                  {confirmingDeleteId === story.id ? (
                    <span className="flex items-center gap-2 text-sm font-bold text-warn-text">
                      Verwijderen?
                      <button type="button" onClick={() => deleteStory(story.id)} className="font-extrabold underline">
                        Ja
                      </button>
                      <button type="button" onClick={() => setConfirmingDeleteId(null)} className="font-extrabold">
                        Nee
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(story.id)}
                      className="text-sm font-extrabold text-warn-text"
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'vriendenboekje' && (
        <div className="flex flex-col gap-3">
          {questions.map((q) => {
            const answer = answers.find((a) => a.question_id === q.id)?.answer ?? ''
            return (
              <Card key={q.id}>
                <p className="text-xs font-extrabold uppercase tracking-wide text-ink-400">{q.label}</p>
                {isOwn ? (
                  <input
                    className="mt-2 w-full bg-transparent text-ink-700 outline-none placeholder:text-ink-400/50"
                    placeholder="Nog niet ingevuld"
                    defaultValue={answer}
                    onBlur={(e) => saveAnswer(q.id, e.target.value)}
                  />
                ) : (
                  <p className="mt-2 text-ink-700">{answer || '—'}</p>
                )}
              </Card>
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

          {scribbles === null && <p className="text-sm text-ink-400">Even ophalen...</p>}
          {scribbles?.length === 0 && <Card className="text-center text-ink-400">Nog geen krabbels.</Card>}
          {scribbles?.map((s, i) => (
            <div key={s.id} className={`rounded-card p-5 ${SCRIBBLE_STYLES[i % SCRIBBLE_STYLES.length]}`}>
              <p className="font-hand text-2xl leading-snug">{s.text}</p>
              <p className="mt-2 text-sm font-extrabold opacity-80">
                {s.author?.display_name ?? 'Iemand'} · {timeAgo(s.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AvatarHeader({
  displayName,
  username,
  meta,
  avatarPath,
  onPhotoChange,
  photoBusy,
}: {
  displayName: string
  username: string
  meta?: string
  avatarPath?: string | null
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
        <h1 className="text-2xl font-extrabold text-ink-900">{displayName}</h1>
        <p className="text-sm font-semibold text-ink-400">
          @{username}
          {meta ? ` · ${meta}` : ''}
        </p>
      </div>
    </div>
  )
}
