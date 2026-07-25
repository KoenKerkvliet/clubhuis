import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { WarningIcon } from '@/components/ui/icons'

interface ModerationEvent {
  id: string
  content_type: string
  content_id: string
  user_id: string | null
  reason: string
  matched_term: string | null
  reviewed: boolean
  created_at: string
}

const FILTERS = [
  { value: 'open' as const, label: 'Nog bekijken' },
  { value: 'reviewed' as const, label: 'Afgehandeld' },
  { value: 'all' as const, label: 'Alle' },
]

const TYPE_LABELS: Record<string, string> = {
  story: 'Verhaal',
  comment: 'Reactie',
  scribble: 'Krabbel',
}

export function AdminModeration() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('open')
  const [events, setEvents] = useState<ModerationEvent[] | null>(null)

  useEffect(() => {
    load()
  }, [filter])

  async function load() {
    setEvents(null)
    let query = supabase
      .from('moderation_events')
      .select('id, content_type, content_id, user_id, reason, matched_term, reviewed, created_at')
      .order('created_at', { ascending: false })

    if (filter === 'open') query = query.eq('reviewed', false)
    if (filter === 'reviewed') query = query.eq('reviewed', true)

    const { data } = await query
    setEvents((data as ModerationEvent[]) ?? [])
  }

  async function markReviewed(id: string) {
    await supabase.from('moderation_events').update({ reviewed: true }).eq('id', id)
    if (filter === 'open') {
      setEvents((prev) => prev?.filter((e) => e.id !== id) ?? null)
    } else {
      setEvents((prev) => prev?.map((e) => (e.id === id ? { ...e, reviewed: true } : e)) ?? null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Moderatie</h1>
        <p className="mt-1 text-ink-400">
          Automatisch tegengehouden berichten. De schrijver kreeg een vriendelijke uitleg zonder het gewraakte woord te
          noemen.
        </p>
      </div>

      <SegmentedTabs value={filter} onChange={setFilter} options={FILTERS} />

      <div className="flex flex-col gap-3">
        {events === null && <p className="text-sm text-ink-400">Even ophalen...</p>}
        {events?.length === 0 && (
          <Card className="text-center text-ink-400">
            <p>Niets tegengehouden. Dat is goed nieuws.</p>
          </Card>
        )}

        {events?.map((event) => (
          <Card key={event.id} className={event.reviewed ? 'opacity-70' : ''}>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-squircle bg-warn-bg text-warn-text">
                <WarningIcon width={20} height={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className="bg-neutral-badge text-ink-500">
                    {TYPE_LABELS[event.content_type] ?? event.content_type}
                  </Pill>
                  {event.reviewed && (
                    <Pill className="bg-avatar-green-bg text-avatar-green-text">Afgehandeld</Pill>
                  )}
                </div>
                <p className="mt-2 font-bold text-ink-900">{event.reason}</p>
                {event.matched_term && (
                  <p className="mt-1 text-sm font-semibold text-ink-400">Aanleiding: {event.matched_term}</p>
                )}
                <p className="mt-1 text-xs font-semibold text-ink-400">
                  {new Date(event.created_at).toLocaleString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {!event.reviewed && (
              <Button variant="secondary" className="mt-4" onClick={() => markReviewed(event.id)}>
                Markeer als bekeken
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
