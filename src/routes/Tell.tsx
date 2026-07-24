import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const CONFIRMATIONS = [
  'Mooi begin, je eerste verhaal is opgeslagen.',
  'Toppie!',
  'Weer een mooie herinnering erbij.',
  'Bewaard voor later.',
  'Weer een bladzijde erbij.',
  'Je herinneringenboek groeit verder.',
  'Fijn dat je dit hebt vastgelegd.',
  'Dat wordt later leuk om terug te lezen.',
]

function pickConfirmation(last: string | null) {
  const options = CONFIRMATIONS.filter((c) => c !== last)
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
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile || !text.trim()) return
    setSubmitting(true)
    setError(null)

    let photoPath: string | null = null
    if (photo) {
      const ext = photo.name.split('.').pop() ?? 'jpg'
      photoPath = `${profile.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('story-photos')
        .upload(photoPath, photo)
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

    const message = pickConfirmation(confirmation)
    setConfirmation(message)
    setText('')
    setPhoto(null)
    if (fileInput.current) fileInput.current.value = ''

    setTimeout(() => navigate('/vandaag'), 900)
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-ink-700">Vertel iets over vandaag</h1>

      {confirmation && (
        <Card className="border border-aura-300 bg-aura-50 text-center text-aura-600">
          {confirmation}
        </Card>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <textarea
            className="w-full resize-none border-none bg-transparent text-lg text-ink-700 outline-none placeholder:text-ink-500/40"
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
            className="mt-3 text-sm text-ink-500"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </Card>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink-500">Wie mag dit zien?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                visibility === 'private'
                  ? 'border-purple-500 bg-purple-100 text-purple-700'
                  : 'border-blue-200 text-ink-500'
              }`}
            >
              Alleen voor mij
            </button>
            <button
              type="button"
              onClick={() => setVisibility('friends')}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                visibility === 'friends'
                  ? 'border-purple-500 bg-purple-100 text-purple-700'
                  : 'border-blue-200 text-ink-500'
              }`}
            >
              Mijn vrienden
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-aura-600">{error}</p>}

        <Button type="submit" disabled={submitting || !text.trim()}>
          {submitting ? 'Bezig met opslaan...' : 'Opslaan'}
        </Button>
      </form>
    </div>
  )
}
