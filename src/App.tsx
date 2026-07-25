import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { isClubhuisOpen } from '@/lib/openingHours'
import { applyThemeColor } from '@/lib/themeColors'
import { AppShell } from '@/components/layout/AppShell'
import { AdminShell } from '@/components/layout/AdminShell'
import { Login } from '@/routes/auth/Login'
import { Register } from '@/routes/auth/Register'
import { ForgotPassword } from '@/routes/auth/ForgotPassword'
import { PrivacyPolicy } from '@/routes/auth/PrivacyPolicy'
import { ResetPassword } from '@/routes/auth/ResetPassword'
import { PendingApproval } from '@/routes/auth/PendingApproval'
import { ClosedScreen } from '@/routes/auth/ClosedScreen'
import { Feed } from '@/routes/Feed'
import { FriendProfile } from '@/routes/FriendProfile'
import { Tell } from '@/routes/Tell'
import { Me } from '@/routes/Me'
import { Profile } from '@/routes/Profile'
import { Notifications } from '@/routes/Notifications'
import { AdminOverview } from '@/routes/admin/AdminOverview'
import { AdminAccounts } from '@/routes/admin/AdminAccounts'
import { AdminContent } from '@/routes/admin/AdminContent'
import { AdminModeration } from '@/routes/admin/AdminModeration'
import { AdminQuestions } from '@/routes/admin/AdminQuestions'
import { LogoMark } from '@/components/ui/LogoMark'

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-cream">
      <LogoMark size={40} className="animate-pulse" />
      <p className="font-hand text-3xl text-blue-500">Clubhuis...</p>
    </div>
  )
}

// Zonder minimum kan de splash bijna niet zichtbaar zijn (bv. bij een warme sessie) en
// voelt de app-start abrupt aan; 1500ms is dubbel zo lang als de eerdere, ongeveer 750ms
// aanvoelende duur.
const MIN_SPLASH_MS = 1500

function useMinDuration(ms: number) {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), ms)
    return () => clearTimeout(id)
  }, [ms])

  return elapsed
}

function useIsOpen(role: string | undefined) {
  const [open, setOpen] = useState(() => isClubhuisOpen(role))

  useEffect(() => {
    setOpen(isClubhuisOpen(role))
    const id = setInterval(() => setOpen(isClubhuisOpen(role)), 60_000)
    return () => clearInterval(id)
  }, [role])

  return open
}

export function App() {
  const { session, profile, loading, recoveryMode } = useAuth()
  const open = useIsOpen(profile?.role)
  const minSplashElapsed = useMinDuration(MIN_SPLASH_MS)

  useEffect(() => {
    applyThemeColor(profile?.theme_color)
  }, [profile?.theme_color])

  if (loading || !minSplashElapsed) return <LoadingScreen />

  // Binnengekomen via een herstel-link: eerst een nieuw wachtwoord kiezen, verder niets.
  if (recoveryMode) return <ResetPassword />

  if (!session) {
    return (
      <Routes>
        <Route path="/registreren" element={<Register />} />
        <Route path="/inloggen" element={<Login />} />
        <Route path="/wachtwoord-vergeten" element={<ForgotPassword />} />
        <Route path="/privacybeleid" element={<PrivacyPolicy />} />
        <Route path="*" element={<Navigate to="/inloggen" replace />} />
      </Routes>
    )
  }

  if (!profile || profile.status !== 'active') {
    return <PendingApproval />
  }

  // Een beheerder beheert; die schrijft geen verhalen en krabbelt niet mee.
  if (profile.role === 'beheerder') {
    return (
      <Routes>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminOverview />} />
          <Route path="accounts" element={<AdminAccounts />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="moderatie" element={<AdminModeration />} />
          <Route path="vragen" element={<AdminQuestions />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  if (!open) {
    return <ClosedScreen />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/ik" element={<Me />} />
        <Route path="/profiel" element={<Profile />} />
        <Route path="/verhalen" element={<Feed />} />
        <Route path="/verhalen/:username" element={<FriendProfile />} />
        <Route path="/vertellen" element={<Tell />} />
        <Route path="/meldingen" element={<Notifications />} />
        <Route path="*" element={<Navigate to="/ik" replace />} />
      </Route>
    </Routes>
  )
}
