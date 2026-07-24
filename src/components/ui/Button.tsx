import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'muted'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3.5 font-extrabold transition-colors disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary: 'bg-blue-500 text-paper hover:bg-blue-600 active:bg-blue-700',
  secondary: 'bg-paper text-ink-700 shadow-softer hover:bg-cream-100',
  ghost: 'bg-transparent text-ink-400 hover:bg-blue-50',
  muted: 'bg-neutral-badge text-ink-500 hover:bg-cream-100',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
