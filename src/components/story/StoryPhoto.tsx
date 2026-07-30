import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'
import { getCachedPhotoUrl } from '@/lib/photoCache'

const SLOW_LOADING_MS = 8_000

/** Privéfoto met blijvende apparaatcache, rustige voortgang en een herstelactie bij traag laden. */
export function StoryPhoto({ path }: { path: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [slow, setSlow] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = containerRef.current
    if (!element || !('IntersectionObserver' in window)) {
      setNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '500px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [path])

  useEffect(() => {
    if (!nearViewport) return
    let active = true
    setUrl(null)
    setLoaded(false)
    setFailed(false)
    setSlow(false)
    const slowTimer = window.setTimeout(() => active && setSlow(true), SLOW_LOADING_MS)

    getCachedPhotoUrl('story-photos', path, attempt > 0).then((photoUrl) => {
      if (!active) return
      if (!photoUrl) setFailed(true)
      else setUrl(photoUrl)
    })

    return () => {
      active = false
      window.clearTimeout(slowTimer)
    }
  }, [path, nearViewport, attempt])

  function retry() {
    setAttempt((value) => value + 1)
  }

  return (
    <div
      ref={containerRef}
      className={`relative mt-3 w-full overflow-hidden rounded-card bg-blue-50 ${
        loaded ? '' : 'aspect-[4/3]'
      }`}
    >
      {url && (
        <img
          src={url}
          alt=""
          className={`max-h-[420px] w-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setLoaded(true)
            setSlow(false)
          }}
          onError={() => {
            setFailed(true)
            setSlow(false)
          }}
        />
      )}

      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-ink-400">
          {failed ? (
            <>
              <p className="font-extrabold text-ink-700">Deze foto kon niet worden geladen.</p>
              <button
                type="button"
                onClick={retry}
                className="rounded-full bg-paper px-4 py-2 text-sm font-extrabold text-blue-500 shadow-softer active:scale-95"
              >
                Opnieuw proberen
              </button>
            </>
          ) : (
            <>
              <LogoMark size={30} className="animate-pulse" />
              <p className="text-sm font-bold">{slow ? 'Dit duurt wat langer…' : 'Foto komt eraan…'}</p>
              {slow && (
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-full bg-paper px-4 py-2 text-sm font-extrabold text-blue-500 shadow-softer active:scale-95"
                >
                  Opnieuw proberen
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
