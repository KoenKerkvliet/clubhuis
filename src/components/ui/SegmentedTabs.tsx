interface SegmentedTabsProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedTabs<T extends string>({ options, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-pill px-3 py-1.5 text-xs font-extrabold transition-colors ${
              active ? 'bg-ink-900 text-paper' : 'bg-paper text-ink-700 shadow-softer'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
