import type { InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Field({ label, id, className = '', ...props }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-ink-400" htmlFor={id}>
      {label}
      <input
        id={id}
        className={`rounded-2xl border border-blue-100 bg-paper px-4 py-3 text-base font-medium text-ink-700 outline-none placeholder:text-ink-400/50 focus:border-blue-400 ${className}`}
        {...props}
      />
    </label>
  )
}
