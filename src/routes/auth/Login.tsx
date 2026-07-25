import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, RESET_REDIRECT_URL } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Wordmark } from '@/components/layout/PageHeader'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setNeedsConfirmation(false)
    setResendState('idle')

    const { error } = await signIn(email, password)

    if (error?.toLowerCase().includes('email not confirmed')) {
      setNeedsConfirmation(true)
    } else if (error) {
      setError('Inloggen lukte niet. Klopt je e-mailadres en wachtwoord?')
    }

    setSubmitting(false)
  }

  async function resendConfirmation() {
    setResendState('sending')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: RESET_REDIRECT_URL },
    })
    setResendState(error ? 'idle' : 'sent')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-1 text-3xl" />
        <p className="mb-6 text-ink-400">Een veilig herinneringenboek, geen feed.</p>
        <Card>
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
            <Field
              id="password"
              label="Wachtwoord"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-warn-text">{error}</p>}

            {needsConfirmation && (
              <div className="rounded-card bg-warn-bg p-4">
                <p className="font-bold text-warn-text">Je e-mailadres is nog niet bevestigd.</p>
                <p className="mt-1 text-sm text-warn-text">
                  Check je inbox (en je spammap) voor de link van Clubhuis, of vraag hieronder een nieuwe aan.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  disabled={resendState !== 'idle'}
                  onClick={resendConfirmation}
                >
                  {resendState === 'sent'
                    ? 'Mail opnieuw verstuurd'
                    : resendState === 'sending'
                      ? 'Bezig...'
                      : 'Stuur bevestigingsmail opnieuw'}
                </Button>
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Bezig...' : 'Inloggen'}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-400">
          <Link to="/wachtwoord-vergeten" className="font-extrabold text-blue-500">
            Wachtwoord vergeten?
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-ink-400">
          Nog geen account?{' '}
          <Link to="/registreren" className="font-extrabold text-blue-500">
            Registreer je hier
          </Link>
        </p>
      </div>
    </div>
  )
}
