import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RESET_REDIRECT_URL } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Pill } from '@/components/ui/Pill'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { CheckIcon, SearchIcon } from '@/components/ui/icons'

type ProfileRow = {
  id: string
  username: string
  display_name: string
  role: string
  status: string
  created_at: string
  avatar_url: string | null
}

const STATUS_FILTERS = [
  { value: 'pending', label: 'Te beoordelen' },
  { value: 'active', label: 'Actief' },
  { value: 'rejected', label: 'Afgewezen' },
  { value: 'blocked', label: 'Geblokkeerd' },
  { value: 'all', label: 'Alle' },
] as const

const ROLES = [
  { value: 'kind', label: 'Kind' },
  { value: 'ouder', label: 'Ouder' },
  { value: 'beheerder', label: 'Beheerder' },
]

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-aura-soft text-aura-text',
  active: 'bg-avatar-green-bg text-avatar-green-text',
  rejected: 'bg-neutral-badge text-ink-500',
  blocked: 'bg-warn-bg text-warn-text',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Te beoordelen',
  active: 'Actief',
  rejected: 'Afgewezen',
  blocked: 'Geblokkeerd',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function AdminAccounts() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['value']>('pending')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ProfileRow[] | null>(null)
  const [confirmingReset, setConfirmingReset] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ id: string; message: string; error?: boolean } | null>(null)

  useEffect(() => {
    load()
  }, [statusFilter])

  async function load() {
    setRows(null)
    let query = supabase
      .from('profiles')
      .select('id, username, display_name, role, status, created_at, avatar_url')
      .order('created_at', { ascending: false })
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query
    setRows((data as ProfileRow[]) ?? [])
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
    if (error) {
      setFeedback({ id, message: 'Aanpassen lukte niet.', error: true })
      return
    }
    if (statusFilter === 'all') {
      setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null)
    } else {
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? null)
    }
  }

  async function setRole(id: string, role: string) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) {
      setFeedback({ id, message: 'Rol wijzigen lukte niet.', error: true })
      return
    }
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, role } : r)) ?? null)
  }

  async function sendPasswordReset(id: string) {
    setConfirmingReset(null)
    setFeedback({ id, message: 'Bezig met versturen...' })

    const { data, error } = await supabase.functions.invoke('admin-password-reset', {
      body: { profile_id: id, redirect_to: RESET_REDIRECT_URL },
    })

    if (error || (data as { error?: string })?.error) {
      setFeedback({ id, message: 'Versturen lukte niet. Probeer het later nog eens.', error: true })
      return
    }
    setFeedback({ id, message: 'Herstelmail verstuurd.' })
  }

  const visible = rows?.filter((row) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return row.username.toLowerCase().includes(q) || row.display_name.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Accounts</h1>
        <p className="mt-1 text-ink-400">Nieuwe leden goedkeuren, rollen bepalen en toegang beheren.</p>
      </div>

      <SegmentedTabs value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />

      <div className="flex items-center gap-2 rounded-pill bg-paper px-4 py-3 shadow-softer">
        <SearchIcon width={18} height={18} className="text-ink-400" />
        <input
          className="w-full bg-transparent text-ink-700 outline-none placeholder:text-ink-400/60"
          placeholder="Zoek op naam of gebruikersnaam"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {rows === null && <p className="text-sm text-ink-400">Even ophalen...</p>}
        {visible?.length === 0 && <Card className="text-center text-ink-400">Niemand in deze lijst.</Card>}

        {visible?.map((row) => (
          <Card key={row.id}>
            <div className="flex items-start gap-3">
              <Avatar name={row.display_name} avatarPath={row.avatar_url} size={48} />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-ink-900">{row.display_name}</p>
                <p className="truncate text-sm font-semibold text-ink-400">@{row.username}</p>
                <p className="mt-1 text-xs font-semibold text-ink-400">Aangemeld op {formatDate(row.created_at)}</p>
              </div>
              <Pill className={STATUS_STYLES[row.status] ?? 'bg-neutral-badge text-ink-500'}>
                {STATUS_LABELS[row.status] ?? row.status}
              </Pill>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-ink-400">Rol</span>
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setRole(row.id, role.value)}
                  className={`rounded-pill px-3.5 py-1.5 text-sm font-extrabold transition-colors ${
                    row.role === role.value ? 'bg-blue-500 text-paper' : 'bg-neutral-badge text-ink-500'
                  }`}
                >
                  {row.role === role.value && <CheckIcon width={13} height={13} strokeWidth={3} className="mr-1 inline" />}
                  {role.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {row.status === 'pending' && (
                <>
                  <Button onClick={() => setStatus(row.id, 'active')}>Goedkeuren</Button>
                  <Button variant="muted" onClick={() => setStatus(row.id, 'rejected')}>
                    Afwijzen
                  </Button>
                </>
              )}

              {row.status === 'active' && (
                <Button variant="muted" onClick={() => setStatus(row.id, 'blocked')}>
                  Blokkeren
                </Button>
              )}

              {(row.status === 'blocked' || row.status === 'rejected') && (
                <Button variant="secondary" onClick={() => setStatus(row.id, 'active')}>
                  Heractiveren
                </Button>
              )}

              {confirmingReset === row.id ? (
                <div className="flex w-full flex-col gap-2 rounded-card bg-warn-bg p-4">
                  <p className="font-bold text-warn-text">
                    Herstelmail sturen naar het e-mailadres van {row.display_name}?
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => sendPasswordReset(row.id)}>Ja, versturen</Button>
                    <Button variant="muted" onClick={() => setConfirmingReset(null)}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmingReset(row.id)}>
                  Wachtwoord herstellen
                </Button>
              )}
            </div>

            {feedback?.id === row.id && (
              <p className={`mt-3 text-sm font-bold ${feedback.error ? 'text-warn-text' : 'text-avatar-green-text'}`}>
                {feedback.message}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
