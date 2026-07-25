import { NavLink } from 'react-router-dom'
import { FriendsIcon, MeIcon, TellIcon, TodayIcon } from '@/components/ui/icons'

const links = [
  { to: '/vandaag', label: 'Vandaag', Icon: TodayIcon },
  { to: '/vrienden', label: 'Vrienden', Icon: FriendsIcon },
]

const endLinks = [{ to: '/ik', label: 'Ik', Icon: MeIcon }]

function NavItem({ to, label, Icon }: { to: string; label: string; Icon: typeof TodayIcon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 rounded-squircle px-3.5 py-2 text-xs font-extrabold transition-colors ${
          isActive ? 'bg-blue-100 text-blue-500' : 'text-ink-400'
        }`
      }
    >
      <Icon width={22} height={22} />
      {label}
    </NavLink>
  )
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-blue-100/70 bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-16px_rgb(38_33_58/0.25)] md:hidden">
      <ul className="mx-auto flex max-w-md items-center justify-between px-3 py-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <NavItem {...link} />
          </li>
        ))}
        <li>
          <NavLink
            to="/vertellen"
            className="flex flex-col items-center gap-0.5 rounded-squircle bg-blue-500 px-5 py-2.5 text-xs font-extrabold text-paper"
          >
            <TellIcon width={24} height={24} />
            Vertellen
          </NavLink>
        </li>
        {endLinks.map((link) => (
          <li key={link.to}>
            <NavItem {...link} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
