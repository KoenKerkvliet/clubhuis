import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { resizeImageToWebp } from '@/lib/image'
import { Card } from '@/components/ui/Card'
import { AvatarHeader, ProfileTabs } from '@/components/profile/ProfileTabs'
import { FavoriteMemoryThumb } from '@/components/story/FavoriteMemoryThumb'

const AVATAR_MAX_DIMENSION = 500
const AVATAR_QUALITY = 0.8
const MAX_FAVORITES = 20

export function Me() {
  const { profile, refreshProfile } = useAuth()
  const [counts, setCounts] = useState({ stories: 0, friends: 0 })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<{ id: string; photo_path: string | null }[] | null>(null)

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

  useEffect(() => {
    if (profile) loadFavorites()
  }, [profile])

  async function loadFavorites() {
    if (!profile) return
    const { data } = await supabase
      .from('stories')
      .select('id, photo_path')
      .eq('author_id', profile.id)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false })
    setFavorites(data ?? [])
  }

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
          <p className="text-sm font-bold text-ink-400">{favorites?.length ?? 0} van {MAX_FAVORITES}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {favorites?.length === 0 && (
            <p className="text-sm text-ink-400">
              Nog geen herinneringen gekozen — markeer een verhaal via de puntjes bij "Verhalen".
            </p>
          )}
          {favorites?.map((story) => (
            <FavoriteMemoryThumb key={story.id} id={story.id} photoPath={story.photo_path} />
          ))}
        </div>
      </Card>

      <ProfileTabs profileId={profile.id} displayName={profile.display_name} isOwn onFavoriteChange={loadFavorites} />
    </div>
  )
}
