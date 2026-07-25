import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Wordmark } from '@/components/layout/PageHeader'

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await requestPasswordReset(email)
    // Bewust altijd dezelfde bevestiging: zo verraadt Clubhuis niet welke adressen bestaan.
    setDone(true)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-1 text-3xl" />
        <p className="mb-6 text-ink-400">Wachtwoord vergeten? Dat is niet erg.</p>

        <Card>
          {done ? (
            <>
              <p className="font-extrabold text-ink-900">Kijk in je mail</p>
              <p className="mt-2 text-ink-400">
                Als dit adres bij Clubhuis bekend is, staat er nu een mailtje klaar met een link om een nieuw wachtwoord
                te kiezen.
              </p>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field
                id="email"
                label="E-mailadres"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Bezig...' : 'Stuur mij een link'}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-4 text-center text-sm text-ink-400">
          <Link to="/inloggen" className="font-extrabold text-blue-500">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    </div>
  )
}
