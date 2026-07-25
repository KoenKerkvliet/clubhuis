import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppShell() {
  return (
    <div className="min-h-dvh md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-28 md:pb-10">
        <Header />
        <main className="mx-auto max-w-md px-4 pt-6 md:max-w-xl md:px-8 lg:max-w-2xl">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
