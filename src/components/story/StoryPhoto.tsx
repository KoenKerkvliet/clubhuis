import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SIGNED_URL_TTL_SECONDS = 60 * 60

/** De story-photos bucket is privé; we tonen een foto altijd via een tijdelijke ondertekende URL. */
export function StoryPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setUrl(null)
    setFailed(false)

    supabase.storage
      .from('story-photos')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) setFailed(true)
        else setUrl(data.signedUrl)
      })

    return () => {
      active = false
    }
  }, [path])

  if (failed) return null

  if (!url) {
    return <div className="mt-3 aspect-[4/3] w-full animate-pulse rounded-card bg-blue-100" />
  }

  return (
    <img
      src={url}
      alt=""
      className="mt-3 max-h-[420px] w-full rounded-card object-cover"
      loading="lazy"
    />
  )
}
