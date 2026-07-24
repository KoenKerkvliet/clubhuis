import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Wordmark } from '@/components/layout/PageHeader'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError('Inloggen lukte niet. Klopt je e-mailadres en wachtwoord?')
    setSubmitting(false)
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
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Bezig...' : 'Inloggen'}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-400">
          Nog geen account?{' '}
          <Link to="/registreren" className="font-extrabold text-blue-500">
            Registreer je hier
          </Link>
        </p>
      </div>
    </div>
  )
}
