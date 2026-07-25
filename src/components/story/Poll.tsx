import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface PollOption {
  id: string
  label: string
  sort_order: number
}

/** Stemmen op een poll-verhaal. Toont na een stem meteen de resultaten als gevulde balken;
 * op een andere optie tikken wijzigt de stem — geen apart "wijzig"-knopje nodig. */
export function Poll({ storyId }: { storyId: string }) {
  const { profile } = useAuth()
  const [options, setOptions] = useState<PollOption[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [myVote, setMyVote] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    load()
  }, [storyId])

  async function load() {
    const [{ data: optionRows }, { data: voteRows }] = await Promise.all([
      supabase.from('poll_options').select('id, label, sort_order').eq('story_id', storyId).order('sort_order'),
      supabase.from('poll_votes').select('option_id, user_id').eq('story_id', storyId),
    ])
    setOptions(optionRows ?? [])

    const tally: Record<string, number> = {}
    for (const v of voteRows ?? []) tally[v.option_id] = (tally[v.option_id] ?? 0) + 1
    setCounts(tally)
    setMyVote((voteRows ?? []).find((v) => v.user_id === profile?.id)?.option_id ?? null)
  }

  async function vote(optionId: string) {
    if (!profile || voting || optionId === myVote) return
    setVoting(true)
    const previous = myVote
    setMyVote(optionId)
    setCounts((prev) => {
      const next = { ...prev }
      if (previous) next[previous] = Math.max(0, (next[previous] ?? 0) - 1)
      next[optionId] = (next[optionId] ?? 0) + 1
      return next
    })
    await supabase.from('poll_votes').upsert({ story_id: storyId, option_id: optionId, user_id: profile.id }, { onConflict: 'story_id,user_id' })
    setVoting(false)
  }

  if (!options) return null

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return (
    <div className="mt-3 flex flex-col gap-2">
      {options.map((opt) => {
        const count = counts[opt.id] ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const mine = myVote === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => vote(opt.id)}
            disabled={voting}
            className={`relative overflow-hidden rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
              mine ? 'border-blue-400' : 'border-transparent'
            } ${myVote ? 'bg-cream' : 'bg-cream hover:border-blue-200'}`}
          >
            {myVote && (
              <span
                className="absolute inset-y-0 left-0 bg-blue-100"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            )}
            <span className="relative flex items-center justify-between gap-3">
              <span className="font-bold text-ink-900">{opt.label}</span>
              {myVote && (
                <span className="shrink-0 text-sm font-semibold text-ink-400">
                  {pct}% · {count}
                </span>
              )}
            </span>
          </button>
        )
      })}
      {myVote && (
        <p className="text-xs font-semibold text-ink-400">
          {total} {total === 1 ? 'stem' : 'stemmen'} · tik een andere optie om je stem te wijzigen
        </p>
      )}
    </div>
  )
}
