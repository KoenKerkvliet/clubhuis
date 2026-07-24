import type { HTMLAttributes } from 'react'
import { AuraIcon, CommentIcon, LockIcon } from '@/components/ui/icons'

export function AuraPill({ count, className = '' }: { count?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill bg-aura-soft px-3.5 py-1.5 text-sm font-extrabold text-aura-text ${className}`}
    >
      <AuraIcon width={16} height={16} />
      Aura{typeof count === 'number' ? ` · ${count}` : ''}
    </span>
  )
}

export function CommentPill({ count, className = '' }: { count: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill bg-neutral-badge px-3.5 py-1.5 text-sm font-extrabold text-ink-500 ${className}`}
    >
      <CommentIcon width={16} height={16} />
      {count}
    </span>
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
