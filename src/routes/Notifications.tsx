import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import {
  AuraIcon,
  BellIcon,
  CheckIcon,
  CommentIcon,
  FriendsIcon,
  PencilIcon,
  XIcon,
} from '@/components/ui/icons'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { setAppBadge } from '@/lib/appBadge'
import { announceNotificationsChanged } from '@/lib/notificationEvents'

interface NotificationPayload {
  from?: string
  by?: string
  friendship_id?: string
  story_id?: string
  comment_id?: string
  parent_id?: string | null
  scribble_id?: string
  profile_id?: string
}

interface Notification {
  id: string
  type: string
  payload: NotificationPayload
  read: boolean
  created_at: string
}

interface ActorInfo {
  name: string
  username: string
  avatarPath: string | null
}

interface NotificationGroup {
  id: string
  items: Notification[]
  type: string
  created_at: string
  read: boolean
}

type Filter = 'all' | 'new'

const PAGE_SIZE = 20
const MAX_ITEMS = 100
const GROUP_WINDOW_MS = 6 * 60 * 60 * 1000

const ICONS: Record<string, { Icon: typeof AuraIcon; bg: string; text: string }> = {
  aura: { Icon: AuraIcon, bg: 'bg-aura-soft', text: 'text-aura-text' },
  scribble: { Icon: PencilIcon, bg: 'bg-aura-soft', text: 'text-aura-text' },
  scribble_reply: { Icon: CommentIcon, bg: 'bg-avatar-green-bg', text: 'text-avatar-green-text' },
  comment: { Icon: CommentIcon, bg: 'bg-avatar-green-bg', text: 'text-avatar-green-text' },
  new_story: { Icon: PencilIcon, bg: 'bg-avatar-blue-bg', text: 'text-avatar-blue-text' },
  friend_request: { Icon: FriendsIcon, bg: 'bg-avatar-blue-bg', text: 'text-avatar-blue-text' },
  friend_accepted: { Icon: CheckIcon, bg: 'bg-avatar-green-bg', text: 'text-avatar-green-text' },
}

function actorId(notification: Notification) {
  return notification.payload.from ?? notification.payload.by
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'zojuist'
  if (minutes < 60) return `${minutes} min. geleden`
  if (hours < 24) return `${hours} uur geleden`
  if (days === 1) return 'gisteren'
  if (days < 7) return `${days} dagen geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const key = date.toDateString()
  if (key === today.toDateString()) return 'Vandaag'
  if (key === yesterday.toDateString()) return 'Gisteren'
  return 'Eerder'
}

function groupKey(notification: Notification) {
  if (notification.type === 'new_story') return 'new_story'
  if (notification.type === 'aura' && notification.payload.story_id) {
    return `aura:${notification.payload.story_id}`
  }
  if (notification.type === 'comment' && notification.payload.story_id) {
    return `comment:${notification.payload.story_id}:${notification.payload.parent_id ? 'reply' : 'story'}`
  }
  return notification.id
}

function groupNotifications(items: Notification[]) {
  const groups: NotificationGroup[] = []

  for (const item of items) {
    const key = groupKey(item)
    const previous = groups.find(
      (group) =>
        group.id === key &&
        new Date(group.created_at).toDateString() === new Date(item.created_at).toDateString() &&
        new Date(group.created_at).getTime() - new Date(item.created_at).getTime() <= GROUP_WINDOW_MS,
    )
    if (previous) {
      previous.items.push(item)
      previous.read = previous.read && item.read
    } else {
      groups.push({
        id: key,
        items: [item],
        type: item.type,
        created_at: item.created_at,
        read: item.read,
      })
    }
  }

  return groups
}

function joinNames(names: string[]) {
  const unique = [...new Set(names)]
  if (unique.length === 0) return 'Iemand'
  if (unique.length === 1) return unique[0]
  if (unique.length === 2) return `${unique[0]} en ${unique[1]}`
  return `${unique[0]} en ${unique.length - 1} anderen`
}

export function Notifications() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [actors, setActors] = useState<Record<string, ActorInfo>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [confirmingClearAll, setConfirmingClearAll] = useState(false)
  const markingRef = useRef(new Set<string>())

  useEffect(() => {
    if (!profile) return
    load()
  }, [profile?.id])

  const filteredItems = useMemo(
    () => (items ?? []).filter((item) => filter === 'all' || !item.read),
    [filter, items],
  )
  const visibleItems = filteredItems.slice(0, visibleCount)
  const groups = useMemo(() => groupNotifications(visibleItems), [visibleItems])
  const sections = useMemo(() => {
    const result: { label: string; groups: NotificationGroup[] }[] = []
    for (const group of groups) {
      const label = dayLabel(group.created_at)
      const section = result.find((entry) => entry.label === label)
      if (section) section.groups.push(group)
      else result.push({ label, groups: [group] })
    }
    return result
  }, [groups])
  const unreadCount = items?.filter((item) => !item.read).length ?? 0

  useEffect(() => {
    if (!items?.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const ids = entries
          .filter((entry) => entry.isIntersecting)
          .flatMap((entry) => (entry.target.getAttribute('data-notification-ids') ?? '').split(','))
          .filter(
            (id) =>
              id &&
              !markingRef.current.has(id) &&
              items.some((item) => item.id === id && !item.read),
          )
        if (ids.length) {
          ids.forEach((id) => markingRef.current.add(id))
          window.setTimeout(() => markRead(ids), 700)
        }
      },
      { threshold: 0.65 },
    )

    document.querySelectorAll('[data-notification-ids]').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [groups, items])

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, payload, read, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS)

    const rows = (data as unknown as Notification[]) ?? []
    setItems(rows)

    const profileIds = [
      ...new Set(
        rows.flatMap((row) =>
          [actorId(row), row.payload.profile_id].filter((value): value is string => !!value),
        ),
      ),
    ]
    if (!profileIds.length) {
      setActors({})
      return
    }

    const { data: profiles } = await supabase
      .from('profile_cards')
      .select('id, username, display_name, avatar_url')
      .in('id', profileIds)
    const map: Record<string, ActorInfo> = {}
    for (const actor of profiles ?? []) {
      if (actor.id) {
        map[actor.id] = {
          name: actor.display_name ?? 'Iemand',
          username: actor.username ?? '',
          avatarPath: actor.avatar_url,
        }
      }
    }
    setActors(map)
  }

  async function markRead(ids: string[]) {
    const unreadIds = ids.filter((id) => items?.some((item) => item.id === id && !item.read))
    if (!unreadIds.length) return
    setItems((previous) =>
      previous?.map((item) => (unreadIds.includes(item.id) ? { ...item, read: true } : item)) ?? null,
    )
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    announceNotificationsChanged()
    if (profile?.badges_enabled) {
      const remaining = Math.max(0, (items?.filter((item) => !item.read).length ?? 0) - unreadIds.length)
      await setAppBadge(remaining)
    }
  }

  async function respond(friendshipId: string, status: 'accepted' | 'declined', group: NotificationGroup) {
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    await removeNotifications(group.items.map((item) => item.id))
  }

  async function removeNotifications(ids: string[]) {
    setItems((previous) => previous?.filter((item) => !ids.includes(item.id)) ?? null)
    await supabase.from('notifications').delete().in('id', ids)
    announceNotificationsChanged()
  }

  async function clearAll() {
    if (!profile) return
    setConfirmingClearAll(false)
    setItems([])
    await supabase.from('notifications').delete().eq('user_id', profile.id)
    announceNotificationsChanged()
    if (profile.badges_enabled) await setAppBadge(0)
  }

  function namesFor(group: NotificationGroup) {
    return joinNames(
      group.items.map((item) => {
        const id = actorId(item)
        return id ? actors[id]?.name ?? 'Iemand' : 'Iemand'
      }),
    )
  }

  function describe(group: NotificationGroup) {
    const names = namesFor(group)
    const count = group.items.length
    const first = group.items[0]

    switch (group.type) {
      case 'aura':
        return count === 1
          ? { actor: names, rest: 'gaf Aura aan je verhaal.' }
          : { actor: names, rest: 'gaven Aura aan je verhaal.' }
      case 'scribble':
        return { actor: names, rest: 'schreef een krabbel op je plekje.' }
      case 'scribble_reply':
        return { actor: names, rest: 'antwoordde op jouw krabbel.' }
      case 'comment':
        return first.payload.parent_id
          ? { actor: names, rest: count === 1 ? 'antwoordde op jouw reactie.' : 'antwoordden op jouw reactie.' }
          : { actor: names, rest: count === 1 ? 'reageerde op je verhaal.' : 'reageerden op je verhaal.' }
      case 'new_story':
        return count === 1
          ? { actor: names, rest: 'plaatste een nieuw verhaal.' }
          : { actor: names, rest: `plaatsten ${count} nieuwe verhalen.` }
      case 'friend_accepted':
        return { actor: names, rest: 'is nu je vriend.' }
      default:
        return { actor: names, rest: '' }
    }
  }

  async function openGroup(group: NotificationGroup) {
    await markRead(group.items.map((item) => item.id))
    const notification = group.items[0]
    const actor = actorId(notification)
    const actorProfile = actor ? actors[actor] : undefined

    if (notification.payload.story_id) {
      const showComments = notification.type === 'comment'
      navigate(
        `/verhalen?story=${notification.payload.story_id}${showComments ? '&comments=1' : ''}`,
      )
      return
    }
    if (notification.type === 'scribble') {
      navigate('/ik?tab=krabbels')
      return
    }
    if (notification.type === 'scribble_reply') {
      const targetId = notification.payload.profile_id
      const target = targetId ? actors[targetId] : undefined
      navigate(targetId === profile?.id || !target ? '/ik?tab=krabbels' : `/verhalen/${target.username}?tab=krabbels`)
      return
    }
    if (actorProfile?.username) navigate(`/verhalen/${actorProfile.username}`)
  }

  function renderGroup(group: NotificationGroup) {
    const first = group.items[0]
    const actor = actorId(first)
    const actorInfo = actor ? actors[actor] : undefined
    const ids = group.items.map((item) => item.id)
    const { Icon, bg, text } = ICONS[group.type] ?? { Icon: BellIcon, bg: 'bg-blue-50', text: 'text-blue-500' }
    const description = describe(group)
    const interactive = !!(
      first.payload.story_id ||
      group.type === 'scribble' ||
      group.type === 'scribble_reply' ||
      actorInfo
    )

    if (group.type === 'friend_request') {
      return (
        <Card
          key={group.id}
          data-notification-ids={ids.join(',')}
          className={`relative border transition-colors ${
            group.read ? 'border-transparent' : 'border-blue-200 bg-blue-50/70'
          }`}
        >
          {!group.read && <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-blue-500" />}
          <button
            type="button"
            className="absolute right-3 top-3 text-ink-400"
            onClick={() => removeNotifications(ids)}
            aria-label="Melding wissen"
          >
            <XIcon width={16} height={16} />
          </button>
          <button type="button" className="flex w-full items-center gap-3 pr-6 text-left" onClick={() => openGroup(group)}>
            <Avatar name={actorInfo?.name ?? 'Iemand'} avatarPath={actorInfo?.avatarPath} size={44} />
            <div>
              <p className="text-ink-900">
                <span className="font-extrabold">{actorInfo?.name ?? 'Iemand'}</span> wil vrienden worden.
              </p>
              <p className="text-xs font-bold text-ink-400">{timeAgo(group.created_at)}</p>
            </div>
          </button>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => first.payload.friendship_id && respond(first.payload.friendship_id, 'accepted', group)}>
              Accepteren
            </Button>
            <Button
              variant="muted"
              onClick={() => first.payload.friendship_id && respond(first.payload.friendship_id, 'declined', group)}
            >
              Weigeren
            </Button>
          </div>
        </Card>
      )
    }

    return (
      <Card
        key={group.id}
        data-notification-ids={ids.join(',')}
        className={`relative border transition-colors ${
          group.read ? 'border-transparent' : 'border-blue-200 bg-blue-50/70'
        }`}
      >
        {!group.read && <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-blue-500" />}
        <button
          type="button"
          onClick={() => interactive && openGroup(group)}
          disabled={!interactive}
          className="flex w-full items-center gap-3 pr-7 text-left disabled:cursor-default"
        >
          {actorInfo && group.items.length === 1 ? (
            <Avatar name={actorInfo.name} avatarPath={actorInfo.avatarPath} size={48} />
          ) : (
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-squircle ${bg} ${text}`}>
              <Icon width={20} height={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-ink-900">
              <span className="font-extrabold">{description.actor}</span> {description.rest}
            </p>
            <p className="text-xs font-bold text-ink-400">{timeAgo(group.created_at)}</p>
          </div>
        </button>
        <button
          type="button"
          className="absolute right-3 top-3 text-ink-400"
          onClick={() => removeNotifications(ids)}
          aria-label="Melding wissen"
        >
          <XIcon width={16} height={16} />
        </button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900">Meldingen</h1>
          <p className="mt-1 text-sm font-bold text-ink-400">
            {unreadCount ? `${unreadCount} nieuw` : 'Je bent helemaal bij'}
          </p>
        </div>
        <IconButton onClick={() => navigate(-1)} aria-label="Sluiten">
          <XIcon width={18} height={18} />
        </IconButton>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-full bg-blue-50 p-1">
          <button
            type="button"
            onClick={() => {
              setFilter('all')
              setVisibleCount(PAGE_SIZE)
            }}
            className={`rounded-full px-4 py-2 text-sm font-extrabold ${
              filter === 'all' ? 'bg-paper text-blue-500 shadow-softer' : 'text-ink-400'
            }`}
          >
            Alles
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter('new')
              setVisibleCount(PAGE_SIZE)
            }}
            className={`rounded-full px-4 py-2 text-sm font-extrabold ${
              filter === 'new' ? 'bg-paper text-blue-500 shadow-softer' : 'text-ink-400'
            }`}
          >
            Nieuw{unreadCount ? ` · ${unreadCount}` : ''}
          </button>
        </div>
        {!!items?.length && (
          <button
            type="button"
            className="text-sm font-extrabold text-ink-400"
            onClick={() => setConfirmingClearAll(true)}
          >
            Wissen
          </button>
        )}
      </div>

      {confirmingClearAll && (
        <div className="flex flex-col gap-2 rounded-card bg-warn-bg p-4">
          <p className="font-bold text-warn-text">Alle meldingen wissen?</p>
          <div className="flex gap-2">
            <Button onClick={clearAll}>Ja, wissen</Button>
            <Button variant="muted" onClick={() => setConfirmingClearAll(false)}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

      {items === null && <LoadingState />}
      {items !== null && filteredItems.length === 0 && (
        <Card className="py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-squircle bg-avatar-green-bg text-avatar-green-text">
            <CheckIcon width={22} height={22} />
          </div>
          <p className="mt-3 font-extrabold text-ink-900">Je bent helemaal bij.</p>
          <p className="mt-1 text-sm font-semibold text-ink-400">
            {filter === 'new' ? 'Je hebt geen ongelezen meldingen.' : 'Hier verschijnen straks je meldingen.'}
          </p>
        </Card>
      )}

      {sections.map((section) => (
        <section key={section.label} className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-ink-400">
            {section.label}
          </h2>
          {section.groups.map(renderGroup)}
        </section>
      ))}

      {visibleCount < filteredItems.length && (
        <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
          Meer meldingen laden
        </Button>
      )}
    </div>
  )
}
