import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { resizeImageToWebp } from '@/lib/image'
import { countDistinctStoryTags, extractStoryTags, MAX_STORY_TAGS } from '@/lib/hashtags'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { TitleHeader } from '@/components/layout/PageHeader'
import { CameraIcon, CheckIcon, FriendsIcon, LockIcon, XIcon } from '@/components/ui/icons'

const MAX_POLL_OPTIONS = 6
const POST_KINDS = [
  { value: 'text' as const, label: 'Verhaal' },
  { value: 'poll' as const, label: 'Poll' },
]

const TAGLINES = [
  'Dat wordt later leuk om terug te lezen.',
  'Bewaard voor later.',
  'Weer een bladzijde erbij.',
  'Fijn dat je dit hebt vastgelegd.',
]

const HEADLINES = [
  'Mooi begin, je eerste verhaal is opgeslagen.',
  'Toppie!',
  'Weer een mooie herinnering erbij.',
  'Je herinneringenboek groeit verder.',
]

interface StoryDraft {
  postKind: 'text' | 'poll'
  text: string
  pollOptions: string[]
  visibility: 'private' | 'friends'
}

function draftKey(profileId: string) {
  return `clubhuis:story-draft:${profileId}`
}

function loadDraft(profileId: string | undefined): StoryDraft | null {
  if (!profileId) return null
  try {
    return JSON.parse(localStorage.getItem(draftKey(profileId)) ?? 'null') as StoryDraft | null
  } catch {
    return null
  }
}

function pick(list: string[], last: string | null) {
  const options = list.filter((c) => c !== last)
  return options[Math.floor(Math.random() * options.length)]
}

export function Tell() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [initialDraft] = useState(() => loadDraft(profile?.id))
  const [postKind, setPostKind] = useState<'text' | 'poll'>(initialDraft?.postKind ?? 'text')
  const [text, setText] = useState(initialDraft?.text ?? '')
  const [pollOptions, setPollOptions] = useState(initialDraft?.pollOptions ?? ['', ''])
  const [visibility, setVisibility] = useState<'private' | 'friends'>(initialDraft?.visibility ?? 'friends')
  const [showRestoredNotice, setShowRestoredNotice] = useState(!!initialDraft?.text)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ headline: string; tagline: string } | null>(null)
  const [dismissingIntro, setDismissingIntro] = useState(false)
  const tags = useMemo(() => extractStoryTags(text), [text])
  const tagCount = useMemo(() => countDistinctStoryTags(text), [text])
  const showHashtagIntro = !!profile && !profile.hashtag_intro_seen_at

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  useEffect(() => {
    if (!profile) return
    const hasContent = !!text.trim() || pollOptions.some((option) => option.trim())
    try {
      if (hasContent) {
        localStorage.setItem(
          draftKey(profile.id),
          JSON.stringify({ postKind, text, pollOptions, visibility } satisfies StoryDraft),
        )
      } else {
        localStorage.removeItem(draftKey(profile.id))
      }
    } catch {
      // Een geblokkeerde opslag mag het schrijven van een verhaal niet hinderen.
    }
  }, [profile?.id, postKind, text, pollOptions, visibility])

  async function handlePhotoSelect(file: File | undefined) {
    if (!file) return
    setError(null)
    setProcessingPhoto(true)
    try {
      setPhoto(await resizeImageToWebp(file))
    } catch {
      setError('Deze foto kon niet worden verwerkt. Probeer een andere foto.')
    } finally {
      setProcessingPhoto(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile || !text.trim()) return

    if (tagCount > MAX_STORY_TAGS) {
      setError(`Kies maximaal ${MAX_STORY_TAGS} hashtags per verhaal.`)
      return
    }

    const trimmedOptions = pollOptions.map((o) => o.trim()).filter(Boolean)
    if (postKind === 'poll' && trimmedOptions.length < 2) {
      setError('Geef minstens twee antwoordmogelijkheden op.')
      return
    }

    setSubmitting(true)
    setError(null)

    let photoPath: string | null = null
    if (postKind === 'text' && photo) {
      const ext = photo.name.split('.').pop() ?? 'jpg'
      photoPath = `${profile.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('story-photos')
        .upload(photoPath, photo, { cacheControl: '31536000' })
      if (uploadError) {
        setError('De foto kon niet worden geüpload. Probeer het opnieuw.')
        setSubmitting(false)
        return
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('stories')
      .insert({
        author_id: profile.id,
        text: text.trim(),
        photo_path: photoPath,
        visibility,
        kind: postKind,
        tags,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      setSubmitting(false)
      setError('Opslaan lukte niet. Probeer het nog eens.')
      return
    }

    if (postKind === 'poll') {
      const { error: optionsError } = await supabase.from('poll_options').insert(
        trimmedOptions.map((label, i) => ({ story_id: inserted.id, label, sort_order: i })),
      )
      if (optionsError) {
        setSubmitting(false)
        setError('De antwoordmogelijkheden konden niet worden opgeslagen. Probeer het nog eens.')
        return
      }
    }

    // Een tijdelijk pushprobleem mag een succesvol geplaatst verhaal niet terugdraaien.
    supabase.functions.invoke('badge-push', {
      body: { action: 'story', story_id: inserted.id },
    })

    setSubmitting(false)
    setShowRestoredNotice(false)
    setConfirmation({ headline: pick(HEADLINES, null), tagline: pick(TAGLINES, null) })
    try {
      localStorage.removeItem(draftKey(profile.id))
    } catch {
      // Het geplaatste verhaal is al veilig opgeslagen.
    }
    setText('')
    setPhoto(null)
    setPollOptions(['', ''])
    setPostKind('text')
    if (fileInput.current) fileInput.current.value = ''
  }

  async function dismissHashtagIntro() {
    if (!profile) return
    setDismissingIntro(true)
    const seenAt = new Date().toISOString()
    const { error } = await supabase
      .from('profiles')
      .update({ hashtag_intro_seen_at: seenAt })
      .eq('id', profile.id)
    if (!error) await refreshProfile()
    setDismissingIntro(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <TitleHeader title={postKind === 'poll' ? 'Nieuwe poll' : 'Jouw verhaal'} />

      <SegmentedTabs
        value={postKind}
        onChange={(value) => {
          setPostKind(value)
          setError(null)
        }}
        options={POST_KINDS}
      />

      {showRestoredNotice && (
        <p className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-500">
          Je vorige concept staat weer klaar.
        </p>
      )}

      {showHashtagIntro && (
        <Card className="bg-blue-50">
          <p className="font-extrabold text-ink-900">Verhalen terugvinden met hashtags</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-500">
            Zet # voor een belangrijk woord, bijvoorbeeld #vakantie of #groep8. Zo kunnen jij en je
            vrienden verhalen over hetzelfde onderwerp later makkelijk terugvinden. Kies maximaal drie
            hashtags per verhaal.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={dismissHashtagIntro}
            disabled={dismissingIntro}
          >
            {dismissingIntro ? 'Even wachten...' : 'Snap ik!'}
          </Button>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <textarea
            className="w-full resize-none border-none bg-transparent text-lg text-ink-700 outline-none placeholder:text-ink-400/50"
            rows={postKind === 'poll' ? 2 : 5}
            maxLength={2000}
            placeholder={postKind === 'poll' ? 'Stel je vraag...' : 'Wat maakte vandaag bijzonder?'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-blue-100 px-3 py-1 text-sm font-extrabold text-blue-500">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {tagCount > MAX_STORY_TAGS && (
            <p className="mt-2 text-sm font-bold text-warn-text">
              Je gebruikt {tagCount} hashtags. Kies er maximaal {MAX_STORY_TAGS}.
            </p>
          )}

          {postKind === 'poll' ? (
            <div className="mt-3 flex flex-col gap-2">
              {pollOptions.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="w-full rounded-full bg-cream px-4 py-2.5 text-ink-700 outline-none placeholder:text-ink-400/60"
                    placeholder={`Optie ${i + 1}`}
                    maxLength={100}
                    value={option}
                    onChange={(e) =>
                      setPollOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))
                    }
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))}
                      className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-400"
                      aria-label="Optie verwijderen"
                    >
                      <XIcon width={16} height={16} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < MAX_POLL_OPTIONS && (
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, ''])}
                  className="self-start text-sm font-extrabold text-blue-500"
                >
                  + Optie toevoegen
                </button>
              )}
            </div>
          ) : photoPreview ? (
            <div className="relative mt-3">
              <img src={photoPreview} alt="" className="max-h-[320px] w-full rounded-2xl object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null)
                  if (fileInput.current) fileInput.current.value = ''
                }}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/70 text-paper"
                aria-label="Foto verwijderen"
              >
                <XIcon width={16} height={16} />
              </button>
            </div>
          ) : (
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-extrabold text-blue-500">
              <CameraIcon width={20} height={20} />
              {processingPhoto ? 'Foto verwerken...' : 'Voeg een foto toe'}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={processingPhoto}
                onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
              />
            </label>
          )}
        </Card>

        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-extrabold uppercase tracking-wide text-ink-400">Wie mag dit zien?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`relative rounded-card border-2 p-4 text-left transition-colors ${
                visibility === 'private' ? 'border-blue-400 bg-blue-100' : 'border-transparent bg-paper shadow-softer'
              }`}
            >
              {visibility === 'private' && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-paper">
                  <CheckIcon width={14} height={14} strokeWidth={3} />
                </span>
              )}
              <LockIcon width={22} height={22} className="text-ink-700" />
              <p className="mt-3 font-extrabold text-ink-900">
                Alleen
                <br />
                voor mij
              </p>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('friends')}
              className={`relative rounded-card border-2 p-4 text-left transition-colors ${
                visibility === 'friends' ? 'border-blue-400 bg-blue-100' : 'border-transparent bg-paper shadow-softer'
              }`}
            >
              {visibility === 'friends' && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-paper">
                  <CheckIcon width={14} height={14} strokeWidth={3} />
                </span>
              )}
              <FriendsIcon width={22} height={22} className="text-ink-700" />
              <p className="mt-3 font-extrabold text-ink-900">
                Mijn
                <br />
                vrienden
              </p>
            </button>
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-warn-text">{error}</p>}

        <Button
          type="submit"
          disabled={
            submitting ||
            processingPhoto ||
            !text.trim() ||
            tagCount > MAX_STORY_TAGS ||
            (postKind === 'poll' && pollOptions.filter((o) => o.trim()).length < 2)
          }
          className="w-full"
        >
          {submitting ? 'Bezig met opslaan...' : postKind === 'poll' ? 'Plaats poll' : 'Bewaar dit verhaal'}
        </Button>
      </form>

      {confirmation && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-overlay p-6">
          <Card className="w-full max-w-xs text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-aura-soft">
              <CheckIcon width={28} height={28} className="text-aura-text" strokeWidth={3} />
            </div>
            <p className="mt-4 text-xl font-extrabold text-ink-900">{confirmation.headline}</p>
            <p className="font-hand mt-2 text-2xl text-ink-400">{confirmation.tagline}</p>
            <Button className="mt-6 w-full" onClick={() => navigate('/ik')}>
              Bekijk mijn plekje
            </Button>
            <button
              type="button"
              className="mt-4 text-sm font-extrabold text-ink-400"
              onClick={() => setConfirmation(null)}
            >
              Klaar
            </button>
          </Card>
        </div>
      )}
    </div>
  )
}
