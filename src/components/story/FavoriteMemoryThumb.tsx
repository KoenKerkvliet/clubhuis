import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SIGNED_URL_TTL_SECONDS = 60 * 60
const SWATCHES = ['bg-blue-200', 'bg-avatar-green-bg', 'bg-avatar-peach-bg', 'bg-blue-100', 'bg-avatar-sand-bg']

function paletteFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return SWATCHES[hash % SWATCHES.length]
}

/** Eén blokje in "Mijn mooiste herinneringen": de foto van het verhaal als die er is,
 * anders een kleurvlak (zoals de oorspronkelijke decoratieve placeholder). */
export function FavoriteMemoryThumb({ id, photoPath }: { id: string; photoPath: string | null }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photoPath) {
      setUrl(null)
      return
    }
    let active = true
    supabase.storage
      .from('story-photos')
      .createSignedUrl(photoPath, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (active && !error && data) setUrl(data.signedUrl)
      })
    return () => {
      active = false
    }
  }, [photoPath])

  if (url) {
    return <img src={url} alt="" className="h-14 w-14 rounded-squircle object-cover" loading="lazy" />
  }

  return <div className={`h-14 w-14 rounded-squircle ${paletteFor(id)}`} />
}
