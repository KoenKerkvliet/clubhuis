import { supabase } from '@/lib/supabase'

const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60
const CACHE_TTL_MS = (SIGNED_URL_TTL_SECONDS - 5 * 60) * 1000
const SESSION_CACHE_KEY = 'clubhuis:signed-image-urls'

interface StoredEntry {
  url: string
  expiresAt: number
}

interface MemoryEntry {
  promise: Promise<string | null>
  expiresAt: number
}

const memoryCache = new Map<string, MemoryEntry>()

function entryKey(bucket: string, path: string) {
  return `${bucket}:${path}`
}

function readSessionEntry(key: string): StoredEntry | null {
  try {
    const cache = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) ?? '{}') as Record<string, StoredEntry>
    const entry = cache[key]
    if (entry?.url && entry.expiresAt > Date.now()) return entry

    if (entry) {
      delete cache[key]
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache))
    }
  } catch {
    // Opslag kan uitstaan in een privévenster; de geheugencache blijft dan gewoon werken.
  }
  return null
}

function writeSessionEntry(key: string, entry: StoredEntry) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) ?? '{}') as Record<string, StoredEntry>
    cache[key] = entry
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Een volle of geblokkeerde sessionStorage mag het laden van foto's niet tegenhouden.
  }
}

/** Hergebruikt per browsersessie dezelfde ondertekende URL. Daardoor kan de browser de
 * afbeelding zelf uit zijn HTTP-cache tonen in plaats van hem opnieuw bij Supabase op te halen. */
export function getSignedImageUrl(bucket: string, path: string): Promise<string | null> {
  const key = entryKey(bucket, path)
  const now = Date.now()
  const cached = memoryCache.get(key)
  if (cached && cached.expiresAt > now) return cached.promise

  const stored = readSessionEntry(key)
  if (stored) {
    const promise = Promise.resolve(stored.url)
    memoryCache.set(key, { promise, expiresAt: stored.expiresAt })
    return promise
  }

  const expiresAt = now + CACHE_TTL_MS
  const promise = supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    .then(({ data, error }) => {
      if (error || !data) return null
      writeSessionEntry(key, { url: data.signedUrl, expiresAt })
      return data.signedUrl
    })

  memoryCache.set(key, { promise, expiresAt })
  return promise
}
