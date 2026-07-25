import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { TitleHeader } from '@/components/layout/PageHeader'

export function Profile() {
  const { profile, refreshProfile, completePasswordReset } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [statusMessage, setStatusMessage] = useState(profile?.status_message ?? '')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusSaved, setStatusSaved] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  if (!profile) return null

  async function saveDisplayName() {
    const trimmed = displayName.trim()
    if (!trimmed || !profile) return
    setSavingName(true)
    setNameSaved(false)
    await supabase.from('profiles').update({ display_name: trimmed }).eq('id', profile.id)
    await refreshProfile()
    setSavingName(false)
    setNameSaved(true)
  }

  async function saveStatusMessage() {
    if (!profile) return
    const trimmed = statusMessage.trim()
    setSavingStatus(true)
    setStatusSaved(false)
    await supabase
      .from('profiles')
      .update({ status_message: trimmed || null })
      .eq('id', profile.id)
    await refreshProfile()
    setSavingStatus(false)
    setStatusSaved(true)
  }

  async function savePassword() {
    setPasswordError(null)
    setPasswordSaved(false)

    if (newPassword.length < 8) {
      setPasswordError('Kies een wachtwoord van minstens 8 tekens.')
      return
    }
    if (newPassword !== repeatPassword) {
      setPasswordError('De twee wachtwoorden zijn niet hetzelfde.')
      return
    }

    setSavingPassword(true)
    const { error } = await completePasswordReset(newPassword)
    setSavingPassword(false)

    if (error) {
      setPasswordError('Opslaan lukte niet. Probeer het nog eens.')
      return
    }
    setNewPassword('')
    setRepeatPassword('')
    setPasswordSaved(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <TitleHeader title="Profiel" />

      <Card>
        <p className="font-extrabold text-ink-900">Schermnaam</p>
        <p className="mt-1 text-sm text-ink-400">Zo zien vrienden je op Clubhuis.</p>
        <div className="mt-3 flex flex-col gap-3">
          <Field
            id="displayName"
            maxLength={40}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              setNameSaved(false)
            }}
          />
          <div className="flex items-center gap-3">
            <Button onClick={saveDisplayName} disabled={savingName || !displayName.trim()}>
              {savingName ? 'Bezig...' : 'Opslaan'}
            </Button>
            {nameSaved && <p className="text-sm font-bold text-avatar-green-text">Opgeslagen!</p>}
          </div>
        </div>
      </Card>

      <Card>
        <p className="font-extrabold text-ink-900">Status</p>
        <p className="mt-1 text-sm text-ink-400">
          Een kort zinnetje dat naast je naam op je plekje komt te staan.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <Field
            id="statusMessage"
            placeholder="Bijv. 'Op vakantie in Zeeland!'"
            maxLength={80}
            value={statusMessage}
            onChange={(e) => {
              setStatusMessage(e.target.value)
              setStatusSaved(false)
            }}
          />
          <div className="flex items-center gap-3">
            <Button onClick={saveStatusMessage} disabled={savingStatus}>
              {savingStatus ? 'Bezig...' : 'Opslaan'}
            </Button>
            {statusSaved && <p className="text-sm font-bold text-avatar-green-text">Opgeslagen!</p>}
          </div>
        </div>
      </Card>

      <Card>
        <p className="font-extrabold text-ink-900">Wachtwoord wijzigen</p>
        <div className="mt-3 flex flex-col gap-3">
          <Field
            id="newPassword"
            label="Nieuw wachtwoord"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setPasswordSaved(false)
            }}
          />
          <Field
            id="repeatPassword"
            label="Nog een keer"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={repeatPassword}
            onChange={(e) => {
              setRepeatPassword(e.target.value)
              setPasswordSaved(false)
            }}
          />
          {passwordError && <p className="text-sm font-bold text-warn-text">{passwordError}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={savePassword} disabled={savingPassword || !newPassword || !repeatPassword}>
              {savingPassword ? 'Bezig...' : 'Wachtwoord opslaan'}
            </Button>
            {passwordSaved && <p className="text-sm font-bold text-avatar-green-text">Opgeslagen!</p>}
          </div>
        </div>
      </Card>
    </div>
  )
}
