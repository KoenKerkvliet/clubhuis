import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { isClubhuisOpen } from '@/lib/openingHours'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/routes/auth/Login'
import { Register } from '@/routes/auth/Register'
import { PendingApproval } from '@/routes/auth/PendingApproval'
import { ClosedScreen } from '@/routes/auth/ClosedScreen'
import { Today } from '@/routes/Today'
import { Friends } from '@/routes/Friends'
import { FriendProfile } from '@/routes/FriendProfile'
import { Tell } from '@/routes/Tell'
import { Me } from '@/routes/Me'
import { Notifications } from '@/routes/Notifications'
import { AdminPortal } from '@/routes/admin/AdminPortal'

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
  const { session, profile, loading } = useAuth()
  const open = useIsOpen(profile?.role)

  if (loading) return <LoadingScreen />

  if (!session) {
    return (
      <Routes>
        <Route path="/registreren" element={<Register />} />
        <Route path="/inloggen" element={<Login />} />
        <Route path="*" element={<Navigate to="/inloggen" replace />} />
      </Routes>
    )
  }

  if (!profile || profile.status !== 'active') {
    return <PendingApproval />
  }

  if (!open) {
    return <ClosedScreen />
  }

  return (
    <Routes>
      <Route path="/admin" element={<AdminPortal />} />
      <Route element={<AppShell />}>
        <Route path="/vandaag" element={<Today />} />
        <Route path="/vrienden" element={<Friends />} />
        <Route path="/vrienden/:username" element={<FriendProfile />} />
        <Route path="/vertellen" element={<Tell />} />
        <Route path="/meldingen" element={<Notifications />} />
        <Route path="/ik" element={<Me />} />
        <Route path="*" element={<Navigate to="/vandaag" replace />} />
      </Route>
    </Routes>
  )
}
