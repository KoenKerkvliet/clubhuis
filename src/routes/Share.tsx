import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { TitleHeader } from '@/components/layout/PageHeader'
import { QrCodeIcon, MailIcon, ShareIcon, LinkIcon } from '@/components/ui/icons'

const INVITE_URL = 'https://clubhuis.eu/registreren'

export function Share() {
  const { profile } = useAuth()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(INVITE_URL, { width: 240, margin: 1, color: { dark: '#231F38', light: '#F7F4EF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [])

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function sendInvite() {
    const trimmed = email.trim()
    if (!trimmed) return
    setSending(true)
    setSendError(null)
    setSent(false)

    const { data, error } = await supabase.functions.invoke('send-invite-email', {
      body: { email: trimmed },
    })
    setSending(false)

    const responseError = (data as { error?: string } | null)?.error
    if (error || responseError) {
      setSendError(responseError ?? 'Versturen lukte niet. Probeer het nog eens.')
      return
    }
    setSent(true)
    setEmail('')
  }

  const [copied, setCopied] = useState(false)
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function shareLink() {
    if (canNativeShare) {
      try {
        await navigator.share({
          title: 'Clubhuis',
          text: `${profile?.display_name ?? 'Iemand'} nodigt je uit voor Clubhuis, een veilig herinneringenboek voor familie en vrienden.`,
          url: INVITE_URL,
        })
      } catch {
        // gebruiker annuleerde het deelvenster zelf — geen foutmelding nodig
      }
      return
    }
    await navigator.clipboard.writeText(INVITE_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      <TitleHeader title="Delen" />
      <p className="text-ink-400">
        Nodig iemand uit voor Clubhuis — bijvoorbeeld opa of oma. Kies wat het handigst is.
      </p>

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-squircle bg-avatar-blue-bg text-avatar-blue-text">
            <QrCodeIcon width={20} height={20} />
          </div>
          <div>
            <p className="font-extrabold text-ink-900">Scan met de camera</p>
            <p className="text-sm text-ink-400">
              Laat de ander deze QR-code scannen met de camera-app op zijn of haar telefoon.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR-code naar de registratiepagina van Clubhuis"
              className="h-48 w-48 rounded-2xl"
            />
          ) : (
            <div className="h-48 w-48 animate-pulse rounded-2xl bg-neutral-badge" />
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-squircle bg-avatar-peach-bg text-avatar-peach-text">
            <MailIcon width={20} height={20} />
          </div>
          <div>
            <p className="font-extrabold text-ink-900">Stuur een mailtje</p>
            <p className="text-sm text-ink-400">We sturen namens jou uitleg en een link om een account te maken.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Field
            id="inviteEmail"
            label="E-mailadres"
            type="email"
            placeholder="naam@voorbeeld.nl"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setSent(false)
            }}
          />
          {sendError && <p className="text-sm font-bold text-warn-text">{sendError}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={sendInvite} disabled={sending || !email.trim()}>
              {sending ? 'Bezig...' : 'Verstuur uitnodiging'}
            </Button>
            {sent && <p className="text-sm font-bold text-avatar-green-text">Verstuurd!</p>}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-squircle bg-avatar-green-bg text-avatar-green-text">
            {canNativeShare ? <ShareIcon width={20} height={20} /> : <LinkIcon width={20} height={20} />}
          </div>
          <div>
            <p className="font-extrabold text-ink-900">{canNativeShare ? 'Deel de link' : 'Kopieer de link'}</p>
            <p className="text-sm text-ink-400">
              {canNativeShare
                ? 'Stuur de uitnodiging via WhatsApp, sms of een andere app.'
                : 'Plak de link in een appje of mailtje naar keuze.'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="secondary" onClick={shareLink}>
            {canNativeShare ? 'Deel link' : copied ? 'Gekopieerd!' : 'Kopieer link'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
