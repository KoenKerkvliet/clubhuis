import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Wordmark } from '@/components/layout/PageHeader'

export function Register() {
  const { signUp } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError('Gebruikersnaam mag alleen kleine letters, cijfers en _ bevatten (3-20 tekens).')
      setSubmitting(false)
      return
    }

    const { error } = await signUp({ email, password, username, displayName })
    if (error) {
      const lower = error.toLowerCase()
      if (lower.includes('duplicate') || lower.includes('already')) {
        setError('Dit e-mailadres of deze gebruikersnaam is al in gebruik.')
      } else if (lower.includes('rate limit')) {
        setError(
          'Er zijn zojuist te veel mails verstuurd. Probeer het over ongeveer een uur nog eens — er is niets aangemaakt.',
        )
      } else {
        setError('Registreren lukte niet. Probeer het nog eens.')
      }
    } else {
      setDone(true)
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream px-4">
        <Card className="max-w-sm text-center">
          <h1 className="mb-2 text-xl font-bold text-ink-900">Bijna klaar!</h1>
          <p className="text-ink-400">
            We hebben je een e-mail gestuurd om je adres te bevestigen. Klik op de link en log
            daarna in — een beheerder keurt je account daarna goed.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-1 text-3xl" />
        <p className="mb-6 text-ink-400">Jouw eigen plekje, samen met echte vrienden.</p>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              id="displayName"
              label="Hoe mogen we je noemen?"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Field
              id="username"
              label="Gebruikersnaam (voor zoeken)"
              required
              placeholder="bijv. milan_09"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />
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
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-warn-text">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Bezig...' : 'Account aanmaken'}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-400">
          Heb je al een account?{' '}
          <Link to="/inloggen" className="font-extrabold text-blue-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
