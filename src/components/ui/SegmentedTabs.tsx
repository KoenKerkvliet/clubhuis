interface SegmentedTabsProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  scrollable?: boolean
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
}: SegmentedTabsProps<T>) {
  return (
    <div
      className={
        scrollable
          ? 'flex snap-x scroll-px-2 gap-1.5 overflow-x-auto pb-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex flex-wrap gap-1.5'
      }
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`shrink-0 snap-start rounded-pill px-3 py-1.5 text-xs font-extrabold transition-colors ${
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
