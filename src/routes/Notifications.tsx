import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { AuraIcon, CommentIcon, PencilIcon, XIcon } from '@/components/ui/icons'
import { Avatar } from '@/components/ui/Avatar'

interface Notification {
  id: string
  type: string
  payload: { from?: string; friendship_id?: string; story_id?: string; scribble_id?: string }
  read: boolean
  created_at: string
}

interface ActorInfo {
  name: string
  avatarPath: string | null
}

interface Actors {
  [userId: string]: ActorInfo
}

const ICONS: Record<string, { Icon: typeof AuraIcon; bg: string; text: string }> = {
  aura: { Icon: AuraIcon, bg: 'bg-aura-soft', text: 'text-aura-text' },
  scribble: { Icon: PencilIcon, bg: 'bg-aura-soft', text: 'text-aura-text' },
  scribble_reply: { Icon: PencilIcon, bg: 'bg-aura-soft', text: 'text-aura-text' },
  comment: { Icon: CommentIcon, bg: 'bg-avatar-green-bg', text: 'text-avatar-green-text' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'gisteren'
  if (days < 14) return 'vorige week'
  return new Date(iso).toLocaleDateString('nl-NL', { month: 'long' })
}

export function Notifications() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [actors, setActors] = useState<Actors>({})
  const [confirmingClearAll, setConfirmingClearAll] = useState(false)

  useEffect(() => {
    if (!profile) return
    load()
  }, [profile])

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, payload, read, created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    const rows = (data as unknown as Notification[]) ?? []
    setItems(rows)

    const actorIds = [...new Set(rows.map((r) => r.payload?.from).filter((v): v is string => !!v))]
    if (actorIds.length) {
      const { data: profiles } = await supabase
        .from('profile_cards')
        .select('id, display_name, avatar_url')
        .in('id', actorIds)
      const map: Actors = {}
      for (const p of profiles ?? []) if (p.id) map[p.id] = { name: p.display_name ?? 'Iemand', avatarPath: p.avatar_url }
      setActors(map)
    }

    await supabase.from('notifications').update({ read: true }).eq('user_id', profile?.id ?? '').eq('read', false)
  }

  async function respond(friendshipId: string, status: 'accepted' | 'declined', notificationId: string) {
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    // Anders blijft deze melding met Accepteren/Weigeren staan nadat het verzoek al is
    // afgehandeld — ook als dat via de Vrienden-feed gebeurde in plaats van hier.
    await supabase.from('notifications').delete().eq('id', notificationId)
    setItems((prev) => prev?.filter((n) => n.id !== notificationId) ?? null)
  }

  async function removeNotification(id: string) {
    setItems((prev) => prev?.filter((n) => n.id !== id) ?? null)
    await supabase.from('notifications').delete().eq('id', id)
  }

  async function clearAll() {
    if (!profile) return
    setConfirmingClearAll(false)
    setItems([])
    await supabase.from('notifications').delete().eq('user_id', profile.id)
  }

  function describe(n: Notification) {
    const actor = n.payload?.from ? actors[n.payload.from]?.name ?? 'Iemand' : 'Iemand'
    switch (n.type) {
      case 'aura':
        return { actor, rest: 'gaf Aura aan je verhaal.' }
      case 'scribble':
        return { actor, rest: 'schreef een krabbel op je plekje.' }
      case 'scribble_reply':
        return { actor, rest: 'reageerde op je krabbel.' }
      case 'comment':
        return { actor, rest: 'reageerde op je verhaal.' }
      case 'friend_accepted':
        return { actor, rest: 'is nu je vriend.' }
      default:
        return { actor, rest: '' }
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-ink-900">Meldingen</h1>
        <IconButton onClick={() => navigate(-1)} aria-label="Sluiten">
          <XIcon width={18} height={18} />
        </IconButton>
      </div>

      {!!items?.length && (
        confirmingClearAll ? (
          <div className="flex flex-col gap-2 rounded-card bg-warn-bg p-4">
            <p className="font-bold text-warn-text">Alle meldingen wissen?</p>
            <div className="flex gap-2">
              <Button onClick={clearAll}>Ja, wissen</Button>
              <Button variant="muted" onClick={() => setConfirmingClearAll(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="self-end text-sm font-extrabold text-ink-400"
            onClick={() => setConfirmingClearAll(true)}
          >
            Alles wissen
          </button>
        )
      )}

      <div className="flex flex-col gap-3">
        {items === null && <p className="text-sm text-ink-400">Even ophalen...</p>}
        {items?.length === 0 && <Card className="text-center text-ink-400">Nog geen meldingen.</Card>}

        {items?.map((n) => {
          if (n.type === 'friend_request') {
            const actorInfo = n.payload.from ? actors[n.payload.from] : undefined
            const actor = actorInfo?.name ?? 'Iemand'
            return (
              <Card key={n.id} className="relative">
                <button
                  type="button"
                  className="absolute right-3 top-3 text-ink-400"
                  onClick={() => removeNotification(n.id)}
                  aria-label="Melding wissen"
                >
                  <XIcon width={16} height={16} />
                </button>
                <div className="flex items-center gap-3 pr-6">
                  <Avatar name={actor} avatarPath={actorInfo?.avatarPath} size={44} />
                  <div>
                    <p className="text-ink-900">
                      <span className="font-extrabold">{actor}</span> wil vrienden worden.
                    </p>
                    <p className="text-xs font-bold text-ink-400">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => n.payload.friendship_id && respond(n.payload.friendship_id, 'accepted', n.id)}>
                    Accepteren
                  </Button>
                  <Button variant="muted" onClick={() => n.payload.friendship_id && respond(n.payload.friendship_id, 'declined', n.id)}>
                    Weigeren
                  </Button>
                </div>
              </Card>
            )
          }

          const { Icon, bg, text } = ICONS[n.type] ?? ICONS.comment
          const { actor, rest } = describe(n)
          return (
            <Card key={n.id} className="relative flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-squircle ${bg} ${text}`}>
                <Icon width={20} height={20} />
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <p className="text-ink-900">
                  <span className="font-extrabold">{actor}</span> {rest}
                </p>
                <p className="text-xs font-bold text-ink-400">{timeAgo(n.created_at)}</p>
              </div>
              <button
                type="button"
                className="absolute right-3 top-3 text-ink-400"
                onClick={() => removeNotification(n.id)}
                aria-label="Melding wissen"
              >
                <XIcon width={16} height={16} />
              </button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
