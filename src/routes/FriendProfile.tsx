import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { TitleHeader } from '@/components/layout/PageHeader'
import { AvatarHeader, ProfileTabs } from '@/components/profile/ProfileTabs'
import { Pill } from '@/components/ui/Pill'
import { CheckIcon } from '@/components/ui/icons'

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

export function FriendProfile() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)

  useEffect(() => {
    if (!username) return
    supabase
      .from('profile_cards')
      .select('id, username, display_name, avatar_url')
      .eq('username', username)
      .maybeSingle()
      .then(({ data }) => setProfile(data as Profile | null))
  }, [username])

  if (profile === undefined) return <p className="text-sm text-ink-400">Even ophalen...</p>
  if (profile === null) return <p className="text-sm text-ink-400">Dit plekje bestaat niet (meer).</p>

  return (
    <div className="flex flex-col gap-6">
      <TitleHeader
        title=""
        action={
          <Pill className="bg-avatar-green-bg text-avatar-green-text">
            <CheckIcon width={14} height={14} strokeWidth={3} />
            Vrienden
          </Pill>
        }
      />
      <AvatarHeader displayName={profile.display_name} username={profile.username} avatarPath={profile.avatar_url} />
      <ProfileTabs profileId={profile.id} displayName={profile.display_name} isOwn={false} />
    </div>
  )
}
