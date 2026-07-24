import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { IconButton } from '@/components/ui/IconButton'
import { ChevronLeftIcon } from '@/components/ui/icons'

type ProfileRow = {
  id: string
  username: string
  display_name: string
  role: string
  status: string
  created_at: string
}

type ModerationEvent = {
  id: string
  content_type: string
  content_id: string
  user_id: string | null
  reason: string
  matched_term: string | null
  reviewed: boolean
  created_at: string
}

const STATUS_FILTERS = [
  { value: 'pending', label: 'Te beoordelen' },
  { value: 'active', label: 'Actief' },
  { value: 'rejected', label: 'Afgewezen' },
  { value: 'blocked', label: 'Geblokkeerd' },
  { value: 'all', label: 'Alle' },
] as const

const ROLES = ['kind', 'ouder', 'beheerder'] as const

function statusLabel(status: string) {
  return { pending: 'Te beoordelen', active: 'Actief', rejected: 'Afgewezen', blocked: 'Geblokkeerd' }[status] ?? status
}

function AccountsPanel() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['value']>('pending')
  const [rows, setRows] = useState<ProfileRow[] | null>(null)

  useEffect(() => {
    load()
  }, [statusFilter])

  async function load() {
    setRows(null)
    let query = supabase.from('profiles').select('id, username, display_name, role, status, created_at').order('created_at', { ascending: false })
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query
    setRows((data as ProfileRow[]) ?? [])
  }

  async function setStatus(id: string, status: string) {
    await supabase.from('profiles').update({ status }).eq('id', id)
    setRows((prev) => prev?.filter((r) => r.id !== id) ?? null)
  }

  async function setRole(id: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, role } : r)) ?? null)
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />

      <div className="flex flex-col gap-3">
        {rows === null && <p className="text-sm text-ink-400">Even ophalen...</p>}
        {rows?.length === 0 && <Card className="text-center text-ink-400">Niemand in deze lijst.</Card>}
        {rows?.map((row) => (
          <Card key={row.id}>
            <div className="flex items-center gap-3">
              <Avatar name={row.display_name} size={44} />
              <div className="flex-1">
                <p className="font-extrabold text-ink-900">{row.display_name}</p>
                <p className="text-sm font-semibold text-ink-400">
                  @{row.username} · {statusLabel(row.status)}
                </p>
              </div>
              <select
                value={row.role}
                onChange={(e) => setRole(row.id, e.target.value)}
                className="rounded-pill bg-neutral-badge px-3 py-1.5 text-sm font-bold text-ink-700 outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {row.status === 'pending' && (
              <div className="mt-4 flex gap-2">
                <Button onClick={() => setStatus(row.id, 'active')}>Goedkeuren</Button>
                <Button variant="muted" onClick={() => setStatus(row.id, 'rejected')}>
                  Afwijzen
                </Button>
              </div>
            )}

            {row.status === 'active' && (
              <div className="mt-4">
                <Button variant="ghost" onClick={() => setStatus(row.id, 'blocked')}>
                  Blokkeren
                </Button>
              </div>
            )}

            {(row.status === 'blocked' || row.status === 'rejected') && (
              <div className="mt-4">
                <Button variant="secondary" onClick={() => setStatus(row.id, 'active')}>
                  Heractiveren
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

function ModerationPanel() {
  const [events, setEvents] = useState<ModerationEvent[] | null>(null)

  useEffect(() => {
    supabase
      .from('moderation_events')
      .select('id, content_type, content_id, user_id, reason, matched_term, reviewed, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setEvents((data as ModerationEvent[]) ?? []))
  }, [])

  async function markReviewed(id: string) {
    await supabase.from('moderation_events').update({ reviewed: true }).eq('id', id)
    setEvents((prev) => prev?.map((e) => (e.id === id ? { ...e, reviewed: true } : e)) ?? null)
  }

  return (
    <div className="flex flex-col gap-3">
      {events === null && <p className="text-sm text-ink-400">Even ophalen...</p>}
      {events?.length === 0 && <Card className="text-center text-ink-400">Geen moderatiemeldingen.</Card>}
      {events?.map((e) => (
        <Card key={e.id} className={e.reviewed ? 'opacity-60' : ''}>
          <p className="text-xs font-extrabold uppercase tracking-wide text-warn-text">{e.content_type}</p>
          <p className="mt-1 text-ink-700">{e.reason}</p>
          {e.matched_term && <p className="mt-1 text-sm font-semibold text-ink-400">Woord: {e.matched_term}</p>}
          {!e.reviewed && (
            <Button variant="ghost" className="mt-3" onClick={() => markReviewed(e.id)}>
              Markeer als bekeken
            </Button>
          )}
        </Card>
      ))}
    </div>
  )
}

export function AdminPortal() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<'accounts' | 'moderation'>('accounts')

  if (profile?.role !== 'beheerder') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-700">Deze omgeving is alleen voor beheerders.</p>
        <Button onClick={() => navigate('/vandaag')}>Terug naar Clubhuis</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-16 pt-6">
      <div className="mb-5 flex items-center gap-3">
        <IconButton onClick={() => navigate('/ik')} aria-label="Terug">
          <ChevronLeftIcon width={20} height={20} />
        </IconButton>
        <h1 className="text-2xl font-extrabold text-ink-900">Beheeromgeving</h1>
      </div>

      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setSection('accounts')}
          className={`rounded-pill px-4 py-2.5 text-sm font-extrabold ${
            section === 'accounts' ? 'bg-ink-900 text-paper' : 'bg-paper text-ink-700 shadow-softer'
          }`}
        >
          Accounts
        </button>
        <button
          type="button"
          onClick={() => setSection('moderation')}
          className={`rounded-pill px-4 py-2.5 text-sm font-extrabold ${
            section === 'moderation' ? 'bg-ink-900 text-paper' : 'bg-paper text-ink-700 shadow-softer'
          }`}
        >
          Moderatie
        </button>
      </div>

      {section === 'accounts' ? <AccountsPanel /> : <ModerationPanel />}
    </div>
  )
}
