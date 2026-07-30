import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { setAppBadge } from '@/lib/appBadge'
import { NOTIFICATIONS_CHANGED_EVENT } from '@/lib/notificationEvents'
import { ToastViewport } from '@/components/ui/ToastViewport'

const IMPORTANT_NOTIFICATION_TYPES = [
  'comment',
  'scribble',
  'scribble_reply',
  'friend_request',
  'friend_accepted',
  'new_story',
]

export function AppShell() {
  const { profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [hasNewStories, setHasNewStories] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadStoryCount, setUnreadStoryCount] = useState(0)

  // Nieuwste verhaal van een vriend vergelijken met wanneer de feed voor het laatst bekeken
  // is — eigen verhalen tellen niet mee, die heeft de gebruiker al gezien.
  useEffect(() => {
    if (!profile) return
    supabase
      .from('stories')
      .select('created_at')
      .eq('visibility', 'friends')
      .neq('author_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && new Date(data.created_at) > new Date(profile.stories_last_viewed_at)) {
          setHasNewStories(true)
        }
      })
  }, [profile?.id])

  useEffect(() => {
    if (!profile) return

    let active = true
    async function refreshUnreadCount() {
      const { data } = await supabase
        .from('notifications')
        .select('type')
        .eq('read', false)
        .in('type', IMPORTANT_NOTIFICATION_TYPES)
      if (active) {
        setUnreadCount(data?.length ?? 0)
        setUnreadStoryCount(data?.filter((notification) => notification.type === 'new_story').length ?? 0)
      }
    }

    refreshUnreadCount()
    const interval = window.setInterval(refreshUnreadCount, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUnreadCount()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnreadCount)

    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnreadCount)
    }
  }, [profile?.id, location.pathname])

  useEffect(() => {
    if (!profile?.badges_enabled) {
      setAppBadge(0)
      return
    }
    setAppBadge(unreadCount + (hasNewStories && unreadStoryCount === 0 ? 1 : 0))
  }, [profile?.badges_enabled, unreadCount, unreadStoryCount, hasNewStories])

  // Zodra de gebruiker op de Verhalen-feed landt, telt dat als "gezien" en verdwijnt de badge.
  useEffect(() => {
    if (location.pathname !== '/verhalen' || !hasNewStories || !profile) return
    setHasNewStories(false)
    setAppBadge(Math.max(0, unreadCount - unreadStoryCount))
    supabase
      .from('profiles')
      .update({ stories_last_viewed_at: new Date().toISOString() })
      .eq('id', profile.id)
      .then(() => refreshProfile())
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('type', 'new_story')
      .eq('read', false)
      .then(() => {
        setUnreadCount((count) => Math.max(0, count - unreadStoryCount))
        setUnreadStoryCount(0)
      })
  }, [location.pathname, hasNewStories, unreadCount, unreadStoryCount, profile, refreshProfile])

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar hasNewStories={hasNewStories} />
      <div className="min-w-0 flex-1 pb-28 md:pb-10">
        <Header />
        <main className="mx-auto max-w-md px-4 pt-6 md:max-w-xl md:px-8 lg:max-w-2xl">
          <Outlet />
        </main>
        <BottomNav hasNewStories={hasNewStories} />
        <ToastViewport />
      </div>
    </div>
  )
}
