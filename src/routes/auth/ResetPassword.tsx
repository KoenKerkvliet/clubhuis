import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Wordmark } from '@/components/layout/PageHeader'

export function ResetPassword() {
  const { completePasswordReset, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Kies een wachtwoord van minstens 8 tekens.')
      return
    }
    if (password !== repeat) {
      setError('De twee wachtwoorden zijn niet hetzelfde.')
      return
    }

    setSubmitting(true)
    const { error: resetError } = await completePasswordReset(password)
    setSubmitting(false)

    if (resetError) setError('Opslaan lukte niet. Vraag een nieuwe link aan.')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-1 text-3xl" />
        <p className="mb-6 text-ink-400">Kies een nieuw wachtwoord voor je plekje.</p>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              id="password"
              label="Nieuw wachtwoord"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Field
              id="repeat"
              label="Nog een keer"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
            {error && <p className="text-sm font-bold text-warn-text">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Bezig...' : 'Bewaar wachtwoord'}
            </Button>
          </form>
        </Card>

        <button
          type="button"
          onClick={() => signOut()}
          className="mt-4 w-full text-center text-sm font-extrabold text-ink-400"
        >
          Toch niet, log mij uit
        </button>
      </div>
    </div>
  )
}
