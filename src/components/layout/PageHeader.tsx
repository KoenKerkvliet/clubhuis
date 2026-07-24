import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '@/components/ui/IconButton'
import { ChevronLeftIcon } from '@/components/ui/icons'

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-extrabold text-ink-900 ${className}`}>
      Clubhuis
      <span className="ml-1 text-aura">•</span>
    </span>
  )
}

interface TitleHeaderProps {
  title: string
  onBack?: () => void
  action?: ReactNode
}

export function TitleHeader({ title, onBack, action }: TitleHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="mb-5 flex items-center gap-3">
      {onBack !== undefined && (
        <IconButton onClick={onBack ?? (() => navigate(-1))} aria-label="Terug">
          <ChevronLeftIcon width={20} height={20} />
        </IconButton>
      )}
      <h1 className="flex-1 text-xl font-extrabold text-ink-900">{title}</h1>
      {action}
    </div>
  )
}

export function BigTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-5 text-3xl font-extrabold text-ink-900">{children}</h1>
}
