import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TitleHeader } from '@/components/layout/PageHeader'
import { CheckIcon, FriendsIcon, LockIcon } from '@/components/ui/icons'

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

function pick(list: string[], last: string | null) {
  const options = list.filter((c) => c !== last)
  return options[Math.floor(Math.random() * options.length)]
}

export function Tell() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'friends'>('friends')
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ headline: string; tagline: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile || !text.trim()) return
    setSubmitting(true)
    setError(null)

    let photoPath: string | null = null
    if (photo) {
      const ext = photo.name.split('.').pop() ?? 'jpg'
      photoPath = `${profile.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('story-photos').upload(photoPath, photo)
      if (uploadError) {
        setError('De foto kon niet worden geüpload. Probeer het opnieuw.')
        setSubmitting(false)
        return
      }
    }

    const { error: insertError } = await supabase.from('stories').insert({
      author_id: profile.id,
      text: text.trim(),
      photo_path: photoPath,
      visibility,
    })

    setSubmitting(false)

    if (insertError) {
      setError('Opslaan lukte niet. Probeer het nog eens.')
      return
    }

    setConfirmation({ headline: pick(HEADLINES, null), tagline: pick(TAGLINES, null) })
    setText('')
    setPhoto(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div className="flex flex-col gap-5">
      <TitleHeader title="Jouw verhaal" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <textarea
            className="w-full resize-none border-none bg-transparent text-lg text-ink-700 outline-none placeholder:text-ink-400/50"
            rows={5}
            maxLength={2000}
            placeholder="Wat maakte vandaag bijzonder?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="mt-3 text-sm font-semibold text-ink-400"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
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

        <Button type="submit" disabled={submitting || !text.trim()} className="w-full">
          {submitting ? 'Bezig met opslaan...' : 'Bewaar dit verhaal'}
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
            <Button className="mt-6 w-full" onClick={() => navigate('/vandaag')}>
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
