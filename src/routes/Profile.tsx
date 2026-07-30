import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { TitleHeader } from '@/components/layout/PageHeader'
import { THEME_COLORS, THEME_COLOR_KEYS, applyThemeColor } from '@/lib/themeColors'
import { CheckIcon } from '@/components/ui/icons'
import { requestBadgePermission, setAppBadge, supportsAppBadge } from '@/lib/appBadge'

export function Profile() {
  const { profile, refreshProfile, completePasswordReset } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [statusMessage, setStatusMessage] = useState(profile?.status_message ?? '')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusSaved, setStatusSaved] = useState(false)

  const [themeColor, setThemeColor] = useState(profile?.theme_color ?? 'blauw')
  const [badgesEnabled, setBadgesEnabled] = useState(profile?.badges_enabled ?? false)
  const [badgeError, setBadgeError] = useState<string | null>(null)
  const [savingBadge, setSavingBadge] = useState(false)

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

  async function chooseThemeColor(key: string) {
    if (!profile || key === themeColor) return
    const previous = themeColor
    setThemeColor(key)
    applyThemeColor(key)
    const { error } = await supabase.from('profiles').update({ theme_color: key }).eq('id', profile.id)
    if (error) {
      setThemeColor(previous)
      applyThemeColor(previous)
      return
    }
    await refreshProfile()
  }

  async function toggleBadges() {
    if (!profile || savingBadge) return
    const next = !badgesEnabled
    setBadgeError(null)

    if (next) {
      const allowed = await requestBadgePermission()
      if (!allowed) {
        setBadgeError(
          supportsAppBadge()
            ? 'Geef Clubhuis toestemming voor meldingen in de instellingen van je telefoon.'
            : 'Dit apparaat ondersteunt geen appbadges voor Clubhuis.',
        )
        return
      }
    }

    setSavingBadge(true)
    const { error } = await supabase.from('profiles').update({ badges_enabled: next }).eq('id', profile.id)
    if (error) {
      setBadgeError('Opslaan lukte niet. Probeer het nog eens.')
    } else {
      setBadgesEnabled(next)
      if (!next) await setAppBadge(0)
      await refreshProfile()
    }
    setSavingBadge(false)
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
        <p className="font-extrabold text-ink-900">Kleurprofiel</p>
        <p className="mt-1 text-sm text-ink-400">Kies je eigen kleur voor knoppen en accenten in de app.</p>
        <div className="mt-3 flex flex-wrap gap-4">
          {THEME_COLOR_KEYS.map((key) => {
            const palette = THEME_COLORS[key]
            const active = themeColor === key
            return (
              <div key={key} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => chooseThemeColor(key)}
                  aria-label={palette.label}
                  className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95"
                  style={{
                    backgroundColor: palette[500],
                    boxShadow: active ? `0 0 0 3px var(--color-paper), 0 0 0 6px ${palette[500]}` : undefined,
                  }}
                >
                  {active && <CheckIcon width={18} height={18} strokeWidth={3} className="text-paper" />}
                </button>
                <span className="text-xs font-bold text-ink-400">{palette.label}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-extrabold text-ink-900">Badge op app-icoon</p>
            <p className="mt-1 text-sm text-ink-400">
              Toon hoeveel nieuwe verhalen en belangrijke meldingen op je wachten.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={badgesEnabled}
            aria-label="Badge op app-icoon"
            disabled={savingBadge}
            onClick={toggleBadges}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              badgesEnabled ? 'bg-blue-500' : 'bg-ink-200'
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-paper shadow-sm transition-transform ${
                badgesEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {badgeError && <p className="mt-3 text-sm font-bold text-warn-text">{badgeError}</p>}
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
