import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '@/components/ui/icons'
import { TOAST_EVENT } from '@/lib/toast'

export function ToastViewport() {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    function onToast(event: Event) {
      const nextMessage = (event as CustomEvent<string>).detail
      if (!nextMessage) return
      setMessage(nextMessage)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setMessage(null), 2600)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!message) return null

  return (
    <div
      className="fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-card bg-ink-900 px-4 py-3 text-paper shadow-soft md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-avatar-green-bg text-avatar-green-text">
        <CheckIcon width={15} height={15} strokeWidth={3} />
      </span>
      <p className="text-sm font-extrabold">{message}</p>
    </div>
  )
}
