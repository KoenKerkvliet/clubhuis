const PALETTE = [
  { bg: 'var(--color-avatar-blue-bg)', text: 'var(--color-avatar-blue-text)' },
  { bg: 'var(--color-avatar-green-bg)', text: 'var(--color-avatar-green-text)' },
  { bg: 'var(--color-avatar-peach-bg)', text: 'var(--color-avatar-peach-text)' },
  { bg: 'var(--color-avatar-sand-bg)', text: 'var(--color-avatar-sand-text)' },
]

function paletteFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

interface AvatarProps {
  name: string
  size?: number
  className?: string
}

export function Avatar({ name, size = 44, className = '' }: AvatarProps) {
  const { bg, text } = paletteFor(name || '?')
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`flex shrink-0 items-center justify-center font-extrabold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: text,
        fontSize: size * 0.42,
        borderRadius: size * 0.32,
      }}
    >
      {initial}
    </div>
  )
}
