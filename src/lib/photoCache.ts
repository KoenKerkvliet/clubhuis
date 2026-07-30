import { getSignedImageUrl } from '@/lib/signedImageUrl'

const CACHE_NAME = 'clubhuis-story-photos-v1'
const INDEX_KEY = 'clubhuis:story-photo-cache-index'
const MAX_CACHED_PHOTOS = 75
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface CacheIndexEntry {
  cachedAt: number
  lastAccessedAt: number
}

const sourcePromises = new Map<string, Promise<string | null>>()
const objectUrls = new Map<string, string>()

function photoKey(bucket: string, path: string) {
  return `${bucket}:${path}`
}

function cacheRequest(key: string) {
  return new Request(
    new URL(`/__clubhuis-photo-cache__/${encodeURIComponent(key)}`, window.location.origin),
  )
}

function readIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '{}') as Record<string, CacheIndexEntry>
  } catch {
    return {}
  }
}

function writeIndex(index: Record<string, CacheIndexEntry>) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {
    // De fotocache blijft een extraatje; volle of geblokkeerde opslag mag Clubhuis niet blokkeren.
  }
}

async function pruneCache(cache: Cache) {
  const index = readIndex()
  const now = Date.now()
  const entries = Object.entries(index).sort(
    ([, left], [, right]) => right.lastAccessedAt - left.lastAccessedAt,
  )
  const remove = entries
    .filter(([, entry], position) => now - entry.cachedAt > MAX_AGE_MS || position >= MAX_CACHED_PHOTOS)
    .map(([key]) => key)

  await Promise.all(remove.map((key) => cache.delete(cacheRequest(key))))
  for (const key of remove) delete index[key]
  writeIndex(index)
}

function rememberObjectUrl(key: string, blob: Blob) {
  const previous = objectUrls.get(key)
  if (previous) URL.revokeObjectURL(previous)
  const url = URL.createObjectURL(blob)
  objectUrls.set(key, url)
  return url
}

async function loadPhoto(bucket: string, path: string, forceRefresh: boolean) {
  const key = photoKey(bucket, path)

  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      if (forceRefresh) await cache.delete(cacheRequest(key))

      const cached = await cache.match(cacheRequest(key))
      if (cached) {
        const index = readIndex()
        index[key] = {
          cachedAt: index[key]?.cachedAt ?? Date.now(),
          lastAccessedAt: Date.now(),
        }
        writeIndex(index)
        return rememberObjectUrl(key, await cached.blob())
      }

      const signedUrl = await getSignedImageUrl(bucket, path)
      if (!signedUrl) return null
      const response = await fetch(signedUrl)
      if (!response.ok) return signedUrl

      const blob = await response.blob()
      try {
        await cache.put(
          cacheRequest(key),
          new Response(blob, {
            headers: { 'Content-Type': blob.type || 'image/webp' },
          }),
        )
        const index = readIndex()
        index[key] = { cachedAt: Date.now(), lastAccessedAt: Date.now() }
        writeIndex(index)
        await pruneCache(cache)
      } catch {
        // Safari kan Cache Storage opruimen of weigeren; de zojuist geladen foto blijft bruikbaar.
      }
      return rememberObjectUrl(key, blob)
    } catch {
      // Val terug op de gewone ondertekende URL als Cache Storage niet beschikbaar is.
    }
  }

  return getSignedImageUrl(bucket, path)
}

/** Geeft eerst de blijvende apparaatcache terug en haalt alleen bij een cachemiss de
 * privéfoto opnieuw op. Gelijktijdige aanvragen voor dezelfde foto delen één promise. */
export function getCachedPhotoUrl(bucket: string, path: string, forceRefresh = false) {
  const key = photoKey(bucket, path)
  if (forceRefresh) {
    sourcePromises.delete(key)
    const objectUrl = objectUrls.get(key)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrls.delete(key)
  }

  const existing = sourcePromises.get(key)
  if (existing) return existing

  const promise = loadPhoto(bucket, path, forceRefresh).catch(() => null)
  sourcePromises.set(key, promise)
  return promise
}

/** Op een gedeeld apparaat mogen foto's van de vorige gebruiker niet in Clubhuis blijven staan. */
export async function clearPhotoCache() {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url)
  objectUrls.clear()
  sourcePromises.clear()
  try {
    if ('caches' in window) await caches.delete(CACHE_NAME)
    localStorage.removeItem(INDEX_KEY)
  } catch {
    // Uitloggen moet altijd doorgaan, ook als de browser zijn cache al heeft verwijderd.
  }
}
