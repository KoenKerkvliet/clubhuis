import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { isClubhuisOpen } from '@/lib/openingHours'
import { AppShell } from '@/components/layout/AppShell'
import { AdminShell } from '@/components/layout/AdminShell'
import { Login } from '@/routes/auth/Login'
import { Register } from '@/routes/auth/Register'
import { ForgotPassword } from '@/routes/auth/ForgotPassword'
import { ResetPassword } from '@/routes/auth/ResetPassword'
import { PendingApproval } from '@/routes/auth/PendingApproval'
import { ClosedScreen } from '@/routes/auth/ClosedScreen'
import { Friends } from '@/routes/Friends'
import { FriendProfile } from '@/routes/FriendProfile'
import { Tell } from '@/routes/Tell'
import { Me } from '@/routes/Me'
import { Notifications } from '@/routes/Notifications'
import { AdminOverview } from '@/routes/admin/AdminOverview'
import { AdminAccounts } from '@/routes/admin/AdminAccounts'
import { AdminContent } from '@/routes/admin/AdminContent'
import { AdminModeration } from '@/routes/admin/AdminModeration'
import { AdminQuestions } from '@/routes/admin/AdminQuestions'

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream">
      <p className="font-hand text-3xl text-blue-500">Clubhuis...</p>
    </div>
  )
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

  if (loading) return <LoadingScreen />

  // Binnengekomen via een herstel-link: eerst een nieuw wachtwoord kiezen, verder niets.
  if (recoveryMode) return <ResetPassword />

  if (!session) {
    return (
      <Routes>
        <Route path="/registreren" element={<Register />} />
        <Route path="/inloggen" element={<Login />} />
        <Route path="/wachtwoord-vergeten" element={<ForgotPassword />} />
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
        <Route path="/vrienden" element={<Friends />} />
        <Route path="/vrienden/:username" element={<FriendProfile />} />
        <Route path="/vertellen" element={<Tell />} />
        <Route path="/meldingen" element={<Notifications />} />
        <Route path="*" element={<Navigate to="/ik" replace />} />
      </Route>
    </Routes>
  )
}
