import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { resizeImageToWebp } from '@/lib/image'
import { Card } from '@/components/ui/Card'
import { AvatarHeader, ProfileTabs } from '@/components/profile/ProfileTabs'

const SWATCHES = ['bg-blue-200', 'bg-avatar-green-bg', 'bg-avatar-peach-bg', 'bg-blue-100', 'bg-avatar-sand-bg']
const AVATAR_MAX_DIMENSION = 500
const AVATAR_QUALITY = 0.8

export function Me() {
  const { profile, refreshProfile } = useAuth()
  const [counts, setCounts] = useState({ stories: 0, friends: 0 })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

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

  async function handleAvatarChange(file: File) {
    if (!profile) return
    setPhotoError(null)
    setUploadingPhoto(true)
    try {
      const resized = await resizeImageToWebp(file, AVATAR_MAX_DIMENSION, AVATAR_QUALITY)
      const path = `${profile.id}/${crypto.randomUUID()}.webp`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, resized)
      if (uploadError) throw uploadError

      const previousPath = profile.avatar_url
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', profile.id)
      if (updateError) throw updateError

      if (previousPath) await supabase.storage.from('avatars').remove([previousPath])
      await refreshProfile()
    } catch {
      setPhotoError('De profielfoto kon niet worden opgeslagen. Probeer het opnieuw.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (!profile) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <AvatarHeader
          displayName={profile.display_name}
          username={profile.username}
          meta={`${counts.stories} verhalen · ${counts.friends} vrienden`}
          avatarPath={profile.avatar_url}
          onPhotoChange={handleAvatarChange}
          photoBusy={uploadingPhoto}
        />
        {photoError && <p className="mt-2 text-sm font-semibold text-warn-text">{photoError}</p>}
      </div>

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
    </div>
  )
}
