import { NavLink } from 'react-router-dom'
import { FriendsIcon, MeIcon } from '@/components/ui/icons'

function NavItem({ to, label, Icon }: { to: string; label: string; Icon: typeof MeIcon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex w-full flex-col items-center gap-0.5 rounded-squircle px-3.5 py-2 text-xs font-extrabold transition-colors ${
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
      <ul className="mx-auto flex max-w-md items-center px-3 py-2.5">
        <li className="flex-1">
          <NavItem to="/ik" label="Ik" Icon={MeIcon} />
        </li>
        <li className="flex-1">
          <NavItem to="/verhalen" label="Verhalen" Icon={FriendsIcon} />
        </li>
      </ul>
    </nav>
  )
}
