import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { PrivatePill } from '@/components/ui/Pill'
import { ArrowRightIcon } from '@/components/ui/icons'

type Tab = 'verhalen' | 'vriendenboekje' | 'krabbels'

interface Story {
  id: string
  text: string
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
      .select('id, text, visibility, created_at')
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
              <p className="mt-3 text-ink-700">{story.text}</p>
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

export function AvatarHeader({ displayName, username, meta }: { displayName: string; username: string; meta?: string }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar name={displayName} size={64} />
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
