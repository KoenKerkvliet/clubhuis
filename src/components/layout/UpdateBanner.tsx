import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/** Elk uur even kijken of er een nieuwe versie klaarstaat. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Meldt rustig dat er een nieuwe versie is, in plaats van de pagina zomaar te herladen.
 * Zo raakt niemand een half getypt verhaal kwijt.
 */
export function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false)
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null)

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setApplyUpdate(() => () => updateSW(true))
        setUpdateReady(true)
      },
      onRegisteredSW(_url, registration) {
        if (registration) {
          setInterval(() => registration.update(), CHECK_INTERVAL_MS)
        }
      },
    })
  }, [])

  if (!updateReady) return null

  return (
    <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-card bg-ink-900 px-5 py-4 text-paper shadow-soft">
        <p className="flex-1 text-sm font-bold">Er is een nieuwe versie van Clubhuis.</p>
        <button
          type="button"
          onClick={() => applyUpdate?.()}
          className="rounded-pill bg-blue-500 px-4 py-2 text-sm font-extrabold text-paper"
        >
          Vernieuwen
        </button>
      </div>
    </div>
  )
}
