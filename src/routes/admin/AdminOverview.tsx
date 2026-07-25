import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'

interface Stats {
  pending: number
  active: number
  openModeration: number
  storiesThisWeek: number
}

function StatTile({
  label,
  value,
  hint,
  to,
  accent,
}: {
  label: string
  value: number | null
  hint: string
  to: string
  accent?: boolean
}) {
  return (
    <Link to={to}>
      <Card className={`h-full ${accent && value ? 'bg-aura-soft' : ''}`}>
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink-400">{label}</p>
        <p className={`mt-2 text-4xl font-extrabold ${accent && value ? 'text-aura-text' : 'text-ink-900'}`}>
          {value ?? '–'}
        </p>
        <p className="mt-1 text-sm font-semibold text-ink-400">{hint}</p>
      </Card>
    </Link>
  )
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

    Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('moderation_events').select('id', { count: 'exact', head: true }).eq('reviewed', false),
      supabase.from('stories').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    ]).then(([pending, active, moderation, stories]) => {
      setStats({
        pending: pending.count ?? 0,
        active: active.count ?? 0,
        openModeration: moderation.count ?? 0,
        storiesThisWeek: stories.count ?? 0,
      })
    })
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Overzicht</h1>
        <p className="mt-1 text-ink-400">Wat vraagt vandaag je aandacht?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Te beoordelen"
          value={stats?.pending ?? null}
          hint="wachten op goedkeuring"
          to="/admin/accounts"
          accent
        />
        <StatTile
          label="Moderatie"
          value={stats?.openModeration ?? null}
          hint="nog niet bekeken"
          to="/admin/moderatie"
          accent
        />
        <StatTile label="Actieve leden" value={stats?.active ?? null} hint="mogen meedoen" to="/admin/accounts" />
        <StatTile
          label="Verhalen"
          value={stats?.storiesThisWeek ?? null}
          hint="afgelopen 7 dagen"
          to="/admin/content"
        />
      </div>

      <Card className="bg-blue-100">
        <p className="font-extrabold text-ink-900">Belofte aan ouders</p>
        <p className="mt-1 text-ink-700">
          Wij beschermen niet alleen de gegevens van een kind, maar ook zijn of haar aandacht. Beheer gaat hier over
          veiligheid — niet over meer schermtijd.
        </p>
      </Card>
    </div>
  )
}
