import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AvatarHeader, ProfileTabs } from '@/components/profile/ProfileTabs'

const SWATCHES = ['bg-blue-200', 'bg-avatar-green-bg', 'bg-avatar-peach-bg', 'bg-blue-100', 'bg-avatar-sand-bg']

export function Me() {
  const { profile, signOut } = useAuth()
  const [counts, setCounts] = useState({ stories: 0, friends: 0 })

  useEffect(() => {
    if (!profile) return
    Promise.all([
      supabase.from('stories').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
      supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
    ]).then(([stories, friends]) => {
      setCounts({ stories: stories.count ?? 0, friends: friends.count ?? 0 })
    })
  }, [profile])

  if (!profile) return null

  return (
    <div className="flex flex-col gap-6">
      <AvatarHeader
        displayName={profile.display_name}
        username={profile.username}
        meta={`${counts.stories} verhalen · ${counts.friends} vrienden`}
      />

      <Card>
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-ink-900">Mijn mooiste herinneringen</p>
          <p className="text-sm font-bold text-ink-400">0 van 20</p>
        </div>
        <div className="mt-3 flex gap-2.5">
          {SWATCHES.map((swatch, i) => (
            <div key={i} className={`h-14 w-14 rounded-squircle ${swatch}`} />
          ))}
        </div>
      </Card>

      <ProfileTabs profileId={profile.id} displayName={profile.display_name} isOwn />

      <Button variant="ghost" onClick={() => signOut()}>
        Uitloggen
      </Button>
    </div>
  )
}
