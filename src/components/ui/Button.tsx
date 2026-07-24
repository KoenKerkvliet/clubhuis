import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] px-5 py-3 font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary: 'bg-purple-600 text-paper-0 shadow-soft hover:bg-purple-700 active:bg-purple-700',
  secondary: 'bg-blue-100 text-purple-700 hover:bg-blue-200',
  ghost: 'bg-transparent text-ink-500 hover:bg-blue-100',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
