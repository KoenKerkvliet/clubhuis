import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Pill } from '@/components/ui/Pill'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'

type ContentKind = 'stories' | 'comments' | 'scribbles'

interface ContentItem {
  id: string
  text: string
  created_at: string
  authorName: string
  /** Alleen bij verhalen: privé of gedeeld met vrienden. */
  visibility?: string
  /** Bij krabbels: op wiens plekje het staat. */
  context?: string
}

const TABS = [
  { value: 'stories' as const, label: 'Verhalen' },
  { value: 'comments' as const, label: 'Reacties' },
  { value: 'scribbles' as const, label: 'Krabbels' },
]

const TABLE_BY_KIND = {
  stories: 'stories',
  comments: 'story_comments',
  scribbles: 'scribbles',
} as const

function formatMoment(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminContent() {
  const [kind, setKind] = useState<ContentKind>('stories')
  const [items, setItems] = useState<ContentItem[] | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load(kind)
  }, [kind])

  async function load(current: ContentKind) {
    setItems(null)
    setError(null)

    if (current === 'stories') {
      const { data } = await supabase
        .from('stories')
        .select('id, text, created_at, visibility, profiles!stories_author_id_fkey(display_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      setItems(
        ((data ?? []) as unknown as {
          id: string
          text: string
          created_at: string
          visibility: string
          profiles: { display_name: string } | null
        }[]).map((row) => ({
          id: row.id,
          text: row.text,
          created_at: row.created_at,
          visibility: row.visibility,
          authorName: row.profiles?.display_name ?? 'Onbekend',
        })),
      )
      return
    }

    if (current === 'comments') {
      const { data } = await supabase
        .from('story_comments')
        .select('id, text, created_at, profiles!story_comments_author_id_fkey(display_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      setItems(
        ((data ?? []) as unknown as {
          id: string
          text: string
          created_at: string
          profiles: { display_name: string } | null
        }[]).map((row) => ({
          id: row.id,
          text: row.text,
          created_at: row.created_at,
          authorName: row.profiles?.display_name ?? 'Onbekend',
        })),
      )
      return
    }

    const { data } = await supabase
      .from('scribbles')
      .select(
        'id, text, created_at, author:profiles!scribbles_author_id_fkey(display_name), owner:profiles!scribbles_profile_id_fkey(display_name)',
      )
      .order('created_at', { ascending: false })
      .limit(50)
    setItems(
      ((data ?? []) as unknown as {
        id: string
        text: string
        created_at: string
        author: { display_name: string } | null
        owner: { display_name: string } | null
      }[]).map((row) => ({
        id: row.id,
        text: row.text,
        created_at: row.created_at,
        authorName: row.author?.display_name ?? 'Onbekend',
        context: row.owner?.display_name ? `op het plekje van ${row.owner.display_name}` : undefined,
      })),
    )
  }

  async function remove(id: string) {
    setConfirmingDelete(null)
    const { error: deleteError } = await supabase.from(TABLE_BY_KIND[kind]).delete().eq('id', id)
    if (deleteError) {
      setError('Verwijderen lukte niet.')
      return
    }
    setItems((prev) => prev?.filter((item) => item.id !== id) ?? null)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Content</h1>
        <p className="mt-1 text-ink-400">
          Meelezen voor moderatie. Verwijderen is definitief — doe het alleen als het echt nodig is.
        </p>
      </div>

      <SegmentedTabs value={kind} onChange={setKind} options={TABS} />

      {error && <p className="text-sm font-bold text-warn-text">{error}</p>}

      <div className="flex flex-col gap-3">
        {items === null && <p className="text-sm text-ink-400">Even ophalen...</p>}
        {items?.length === 0 && <Card className="text-center text-ink-400">Nog niets geplaatst.</Card>}

        {items?.map((item) => (
          <Card key={item.id}>
            <div className="flex items-center gap-3">
              <Avatar name={item.authorName} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-ink-900">{item.authorName}</p>
                <p className="truncate text-xs font-semibold text-ink-400">
                  {formatMoment(item.created_at)}
                  {item.context ? ` · ${item.context}` : ''}
                </p>
              </div>
              {item.visibility === 'private' && (
                <Pill className="bg-avatar-sand-bg text-avatar-sand-text">Privé</Pill>
              )}
            </div>

            <p className={`mt-3 text-ink-700 ${kind === 'scribbles' ? 'font-hand text-2xl leading-snug' : ''}`}>
              {item.text}
            </p>

            {confirmingDelete === item.id ? (
              <div className="mt-4 flex flex-col gap-2 rounded-card bg-warn-bg p-4">
                <p className="font-bold text-warn-text">Dit bericht definitief verwijderen?</p>
                <div className="flex gap-2">
                  <Button onClick={() => remove(item.id)}>Ja, verwijderen</Button>
                  <Button variant="muted" onClick={() => setConfirmingDelete(null)}>
                    Annuleren
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="mt-3" onClick={() => setConfirmingDelete(item.id)}>
                Verwijderen
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
