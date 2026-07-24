import { NavLink } from 'react-router-dom'
import { FriendsIcon, MeIcon, PlayIcon, TellIcon, TodayIcon } from '@/components/ui/icons'

const links = [
  { to: '/vandaag', label: 'Vandaag', Icon: TodayIcon },
  { to: '/vrienden', label: 'Vrienden', Icon: FriendsIcon },
  { to: '/vertellen', label: 'Vertellen', Icon: TellIcon, primary: true },
  { to: '/spelen', label: 'Spelen', Icon: PlayIcon },
  { to: '/ik', label: 'Ik', Icon: MeIcon },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-blue-100 bg-paper-0/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
        {links.map(({ to, label, Icon, primary }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                primary
                  ? 'flex flex-col items-center gap-1 -translate-y-3 rounded-full bg-purple-600 p-3.5 text-paper-0 shadow-soft'
                  : `flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-medium ${
                      isActive ? 'text-purple-600' : 'text-ink-500'
                    }`
              }
              aria-label={label}
            >
              <Icon width={primary ? 26 : 22} height={primary ? 26 : 22} />
              {!primary && <span>{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
