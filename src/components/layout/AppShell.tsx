import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppShell() {
  const { profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [hasNewStories, setHasNewStories] = useState(false)

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

  // Zodra de gebruiker op de Verhalen-feed landt, telt dat als "gezien" en verdwijnt de badge.
  useEffect(() => {
    if (location.pathname !== '/verhalen' || !hasNewStories || !profile) return
    setHasNewStories(false)
    supabase
      .from('profiles')
      .update({ stories_last_viewed_at: new Date().toISOString() })
      .eq('id', profile.id)
      .then(() => refreshProfile())
  }, [location.pathname, hasNewStories, profile, refreshProfile])

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar hasNewStories={hasNewStories} />
      <div className="min-w-0 flex-1 pb-28 md:pb-10">
        <Header />
        <main className="mx-auto max-w-md px-4 pt-6 md:max-w-xl md:px-8 lg:max-w-2xl">
          <Outlet />
        </main>
        <BottomNav hasNewStories={hasNewStories} />
      </div>
    </div>
  )
}
