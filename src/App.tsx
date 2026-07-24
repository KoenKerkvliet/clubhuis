import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/routes/auth/Login'
import { Register } from '@/routes/auth/Register'
import { PendingApproval } from '@/routes/auth/PendingApproval'
import { Today } from '@/routes/Today'
import { Friends } from '@/routes/Friends'
import { Tell } from '@/routes/Tell'
import { Play } from '@/routes/Play'
import { Me } from '@/routes/Me'

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-blue-50">
      <p className="font-hand text-3xl text-purple-500">Clubhuis...</p>
    </div>
  )
}

export function App() {
  const { session, profile, loading } = useAuth()

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

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/vandaag" element={<Today />} />
        <Route path="/vrienden" element={<Friends />} />
        <Route path="/vertellen" element={<Tell />} />
        <Route path="/spelen" element={<Play />} />
        <Route path="/ik" element={<Me />} />
        <Route path="*" element={<Navigate to="/vandaag" replace />} />
      </Route>
    </Routes>
  )
}
