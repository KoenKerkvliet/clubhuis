import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ShieldIcon } from '@/components/ui/icons'

const SECTIONS = [
  { to: '/admin', label: 'Overzicht', end: true },
  { to: '/admin/accounts', label: 'Accounts' },
  { to: '/admin/content', label: 'Content' },
  { to: '/admin/moderatie', label: 'Moderatie' },
  { to: '/admin/vragen', label: 'Vriendenboekje' },
]

export function AdminShell() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-dvh bg-cream">
      <header className="bg-ink-900 px-4 pb-4 pt-6 text-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-squircle bg-white/10">
            <ShieldIcon width={20} height={20} />
          </div>
          <div className="flex-1">
            <p className="text-lg font-extrabold leading-tight">
              Clubhuis <span className="font-bold text-blue-200">Beheer</span>
            </p>
            <p className="text-sm font-semibold text-blue-200/80">{profile?.display_name}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-pill bg-white/10 px-4 py-2 text-sm font-extrabold text-paper transition-colors hover:bg-white/20"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-blue-100 bg-cream/95 px-4 py-3 backdrop-blur">
        <ul className="mx-auto flex max-w-3xl gap-2 overflow-x-auto">
          {SECTIONS.map((section) => (
            <li key={section.to}>
              <NavLink
                to={section.to}
                end={section.end}
                className={({ isActive }) =>
                  `block whitespace-nowrap rounded-pill px-4 py-2.5 text-sm font-extrabold transition-colors ${
                    isActive ? 'bg-ink-900 text-paper' : 'bg-paper text-ink-700 shadow-softer'
                  }`
                }
              >
                {section.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Outlet />
      </main>
    </div>
  )
}
