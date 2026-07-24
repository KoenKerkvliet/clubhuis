import type { InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Field({ label, id, className = '', ...props }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-500" htmlFor={id}>
      {label}
      <input
        id={id}
        className={`rounded-2xl border border-blue-200 bg-paper-0 px-4 py-3 text-base text-ink-700 outline-none placeholder:text-ink-500/40 focus:border-purple-400 ${className}`}
        {...props}
      />
    </label>
  )
}
