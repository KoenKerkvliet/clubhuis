import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { resizeImageToWebp } from '@/lib/image'
import { AvatarHeader, ProfileTabs } from '@/components/profile/ProfileTabs'

const AVATAR_MAX_DIMENSION = 500
const AVATAR_QUALITY = 0.8

export function Me() {
  const { profile, refreshProfile } = useAuth()
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = tabsRef.current
    if (!root) return
    const rootEl = root

    function replaceText(node: Node) {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE && child.textContent?.includes('Verhaal vertellen')) {
          child.textContent = child.textContent.replace('Verhaal vertellen', 'Samen spel spelen')
        } else {
          replaceText(child)
        }
      })
    }

    function syncGamesCta() {
      const link = rootEl.querySelector<HTMLAnchorElement>('a[href="/vertellen"]')
      if (!link) return
      link.setAttribute('href', '/spellen')
      replaceText(link)
    }

    syncGamesCta()
    const observer = new MutationObserver(syncGamesCta)
    observer.observe(rootEl, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  async function handleAvatarChange(file: File) {
    if (!profile) return
    setPhotoError(null)
    setUploadingPhoto(true)
    try {
      const resized = await resizeImageToWebp(file, AVATAR_MAX_DIMENSION, AVATAR_QUALITY)
      const path = `${profile.id}/${crypto.randomUUID()}.webp`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, resized, { cacheControl: '31536000' })
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
          avatarPath={profile.avatar_url}
          statusMessage={profile.status_message}
          onPhotoChange={handleAvatarChange}
          photoBusy={uploadingPhoto}
        />
        {photoError && <p className="mt-2 text-sm font-semibold text-warn-text">{photoError}</p>}
      </div>

      <div ref={tabsRef}>
        <ProfileTabs profileId={profile.id} displayName={profile.display_name} isOwn />
      </div>
    </div>
  )
}
