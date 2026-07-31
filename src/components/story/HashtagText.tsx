import type { ReactNode } from 'react'
import { normalizeTag } from '@/lib/hashtags'

const HASHTAG_REGEX = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{2,30})/gu

export function HashtagText({
  text,
  onTagClick,
}: {
  text: string
  onTagClick?: (tag: string) => void
}) {
  const parts: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const fullMatch = match[0]
    const prefix = match[1] ?? ''
    const rawTag = match[2] ?? ''
    const tagStart = match.index + prefix.length
    const tagEnd = match.index + fullMatch.length
    const tag = normalizeTag(rawTag)

    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (prefix) parts.push(prefix)
    parts.push(
      <button
        key={`${tag}-${tagStart}`}
        type="button"
        onClick={() => onTagClick?.(tag)}
        className="font-extrabold text-blue-500 underline-offset-2 hover:underline"
      >
        {text.slice(tagStart, tagEnd)}
      </button>,
    )
    lastIndex = tagEnd
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return <p className="mt-3 whitespace-pre-wrap text-ink-700">{parts}</p>
}
