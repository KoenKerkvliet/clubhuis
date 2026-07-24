import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  badge?: boolean
}

export function IconButton({ children, badge, className = '', ...props }: IconButtonProps) {
  return (
    <button
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-squircle bg-paper text-ink-700 shadow-softer transition-transform active:scale-95 ${className}`}
      {...props}
    >
      {children}
      {badge && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-aura ring-2 ring-paper" />
      )}
    </button>
  )
}
