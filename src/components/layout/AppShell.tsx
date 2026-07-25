import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'

export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28">
      <Header />
      <main className="px-4 pt-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
