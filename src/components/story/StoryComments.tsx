import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ArrowRightIcon } from '@/components/ui/icons'

export interface StoryComment {
  id: string
  author_id: string
  story_id: string
  parent_id: string | null
  text: string
  created_at: string
  profiles: { display_name: string } | null
}

interface StoryCommentsProps {
  storyId: string
  comments: StoryComment[]
  viewerId: string
  onChanged: () => Promise<void>
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

const PREVIEW_COUNT = 2

export function StoryComments({
  storyId,
  comments,
  viewerId,
  onChanged,
  expanded,
  onExpandedChange,
}: StoryCommentsProps) {
  const [draft, setDraft] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busy, setBusy] = useState(false)

  const childrenByParent = useMemo(() => {
    const map: Record<string, StoryComment[]> = {}
    for (const comment of comments) {
      if (comment.parent_id) (map[comment.parent_id] ??= []).push(comment)
    }
    return map
  }, [comments])

  const topLevel = comments.filter((comment) => !comment.parent_id)
  const hiddenCount = Math.max(0, topLevel.length - PREVIEW_COUNT)
  const visibleComments = expanded ? topLevel : topLevel.slice(-PREVIEW_COUNT)

  async function sendComment(parentId: string | null) {
    const text = (parentId ? replyDraft : draft).trim()
    if (!text || busy) return
    setBusy(true)
    const { error } = await supabase.from('story_comments').insert({
      story_id: storyId,
      author_id: viewerId,
      parent_id: parentId,
      text,
    })
    if (!error) {
      if (parentId) {
        setReplyDraft('')
        setReplyingTo(null)
      } else {
        setDraft('')
      }
      await onChanged()
    }
    setBusy(false)
  }

  async function saveEdit(id: string) {
    const text = editText.trim()
    if (!text || busy) return
    setBusy(true)
    const { error } = await supabase.from('story_comments').update({ text }).eq('id', id)
    if (!error) {
      setEditingId(null)
      await onChanged()
    }
    setBusy(false)
  }

  function startReply(comment: StoryComment) {
    setReplyingTo(replyingTo === comment.id ? null : comment.id)
    setReplyDraft('')
    setEditingId(null)
  }

  function startEdit(comment: StoryComment) {
    setEditingId(comment.id)
    setEditText(comment.text)
    setReplyingTo(null)
  }

  function renderComment(comment: StoryComment, depth = 0) {
    const replies = childrenByParent[comment.id] ?? []
    return (
      <div
        key={comment.id}
        className={depth ? 'ml-4 border-l-2 border-blue-100 pl-3' : ''}
      >
        {editingId === comment.id ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full resize-none rounded-2xl border border-blue-200 bg-paper p-3 text-sm text-ink-700 outline-none focus:border-blue-400"
              rows={2}
              maxLength={500}
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => saveEdit(comment.id)} disabled={!editText.trim() || busy}>
                Opslaan
              </Button>
              <Button variant="muted" onClick={() => setEditingId(null)}>
                Annuleren
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-700">
              <span className="font-extrabold text-ink-900">
                {comment.profiles?.display_name ?? 'Iemand'}
              </span>{' '}
              {comment.text}
            </p>
            <div className="mt-1 flex gap-3 text-xs font-extrabold text-ink-400">
              <button type="button" onClick={() => startReply(comment)}>
                Beantwoorden
              </button>
              {comment.author_id === viewerId && (
                <button type="button" onClick={() => startEdit(comment)}>
                  Bewerken
                </button>
              )}
            </div>
          </>
        )}

        {replyingTo === comment.id && (
          <div className="mt-2 flex items-center gap-2">
            <input
              autoFocus
              className="w-full rounded-full bg-cream px-4 py-2 text-sm text-ink-700 outline-none placeholder:text-ink-400/60"
              placeholder={`Antwoord aan ${comment.profiles?.display_name ?? 'deze reactie'}...`}
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && sendComment(comment.id)}
              maxLength={500}
            />
            <button
              type="button"
              onClick={() => sendComment(comment.id)}
              disabled={!replyDraft.trim() || busy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-paper disabled:opacity-40"
              aria-label="Verstuur antwoord"
            >
              <ArrowRightIcon width={16} height={16} />
            </button>
          </div>
        )}

        {replies.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-blue-100/70 pt-4">
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          className="self-start rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-500 transition-colors hover:bg-blue-100 active:scale-95"
        >
          {expanded
            ? 'Minder reacties tonen'
            : hiddenCount === 1
              ? '1 eerdere reactie tonen'
              : `${hiddenCount} eerdere reacties tonen`}
        </button>
      )}
      {visibleComments.map((comment) => renderComment(comment))}
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-full bg-cream px-4 py-2 text-ink-700 outline-none placeholder:text-ink-400/60"
          placeholder="Schrijf een reactie..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && sendComment(null)}
          maxLength={500}
        />
        <button
          type="button"
          onClick={() => sendComment(null)}
          disabled={!draft.trim() || busy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-paper disabled:opacity-40"
          aria-label="Verstuur reactie"
        >
          <ArrowRightIcon width={16} height={16} />
        </button>
      </div>
    </div>
  )
}
