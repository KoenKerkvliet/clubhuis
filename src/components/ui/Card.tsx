import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-card)] bg-paper-0 p-5 shadow-softer ${className}`}
      {...props}
    />
  )
}
