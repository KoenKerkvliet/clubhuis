import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PALETTE = [
  { bg: 'var(--color-avatar-blue-bg)', text: 'var(--color-avatar-blue-text)' },
  { bg: 'var(--color-avatar-green-bg)', text: 'var(--color-avatar-green-text)' },
  { bg: 'var(--color-avatar-peach-bg)', text: 'var(--color-avatar-peach-text)' },
  { bg: 'var(--color-avatar-sand-bg)', text: 'var(--color-avatar-sand-text)' },
]

function paletteFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

const SIGNED_URL_TTL_SECONDS = 60 * 60
interface CacheEntry {
  promise: Promise<string | null>
  expiresAt: number
}
const signedUrlCache = new Map<string, CacheEntry>()

/** Elke Avatar met hetzelfde avatarPath deelt dezelfde ondertekende URL, zodat dezelfde
 * profielfoto niet op elke plek (header, lijst, eigen pagina) opnieuw wordt opgehaald. */
function getSignedAvatarUrl(path: string): Promise<string | null> {
  const now = Date.now()
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > now) return cached.promise

  const promise = supabase.storage
    .from('avatars')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    .then(({ data, error }) => (error || !data ? null : data.signedUrl))
  signedUrlCache.set(path, { promise, expiresAt: now + (SIGNED_URL_TTL_SECONDS - 300) * 1000 })
  return promise
}

interface AvatarProps {
  name: string
  avatarPath?: string | null
  size?: number
  className?: string
}

export function Avatar({ name, avatarPath, size = 44, className = '' }: AvatarProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!avatarPath) {
      setUrl(null)
      return
    }
    let active = true
    getSignedAvatarUrl(avatarPath).then((signedUrl) => {
      if (active) setUrl(signedUrl)
    })
    return () => {
      active = false
    }
  }, [avatarPath])

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`shrink-0 object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: size * 0.32 }}
      />
    )
  }

  const { bg, text } = paletteFor(name || '?')
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`flex shrink-0 items-center justify-center font-extrabold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: text,
        fontSize: size * 0.42,
        borderRadius: size * 0.32,
      }}
    >
      {initial}
    </div>
  )
}
