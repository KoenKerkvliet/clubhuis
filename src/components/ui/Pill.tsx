import type { HTMLAttributes } from 'react'
import { AuraIcon, CommentIcon, LockIcon } from '@/components/ui/icons'

interface AuraPillProps {
  count?: number
  /** Toont de gevulde staat: de kijker heeft zelf al aura gegeven aan dit bericht. */
  active?: boolean
  /** Zonder onClick blijft de pill decoratief (bv. op je eigen bericht). */
  onClick?: () => void
  className?: string
}

export function AuraPill({ count, active = false, onClick, className = '' }: AuraPillProps) {
  const classes = `inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-sm font-extrabold transition-colors ${
    active ? 'bg-aura text-paper' : 'bg-aura-soft text-aura-text'
  } ${onClick ? 'active:scale-95' : ''} ${className}`
  const content = (
    <>
      <AuraIcon width={16} height={16} />
      Aura{typeof count === 'number' ? ` · ${count}` : ''}
    </>
  )

  if (!onClick) return <span className={classes}>{content}</span>

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  )
}

interface CommentPillProps {
  count: number
  onClick?: () => void
  className?: string
}

export function CommentPill({ count, onClick, className = '' }: CommentPillProps) {
  const classes = `inline-flex items-center gap-1.5 rounded-pill bg-neutral-badge px-3.5 py-1.5 text-sm font-extrabold text-ink-500 transition-colors ${
    onClick ? 'hover:bg-cream-100 active:scale-95' : ''
  } ${className}`
  const content = (
    <>
      <CommentIcon width={16} height={16} />
      {count}
    </>
  )

  if (!onClick) return <span className={classes}>{content}</span>

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  )
}

export function PrivatePill({ time, className = '' }: { time?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill bg-avatar-sand-bg px-3.5 py-1.5 text-sm font-extrabold text-avatar-sand-text ${className}`}
    >
      <LockIcon width={15} height={15} />
      Alleen voor mij
      {time && <span className="ml-1 font-semibold text-ink-400">· {time}</span>}
    </span>
  )
}

export function Pill({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-sm font-extrabold ${className}`}
      {...props}
    />
  )
}
