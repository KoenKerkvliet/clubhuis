export const MAX_STORY_TAGS = 3

const HASHTAG_REGEX = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{2,30})/gu

export function normalizeTag(tag: string) {
  return tag
    .replace(/^#/, '')
    .trim()
    .toLocaleLowerCase('nl-NL')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}_]/gu, '')
}

export function extractStoryTags(text: string) {
  const tags: string[] = []
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const tag = normalizeTag(match[2])
    if (tag && !tags.includes(tag)) tags.push(tag)
    if (tags.length >= MAX_STORY_TAGS) break
  }
  return tags
}

export function countDistinctStoryTags(text: string) {
  const tags: string[] = []
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const tag = normalizeTag(match[2])
    if (tag && !tags.includes(tag)) tags.push(tag)
  }
  return tags.length
}

export function formatTag(tag: string) {
  return `#${normalizeTag(tag)}`
}
