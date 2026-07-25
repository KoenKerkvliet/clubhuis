import { NavLink } from 'react-router-dom'
import { FriendsIcon, MeIcon } from '@/components/ui/icons'

function NavItem({
  to,
  label,
  Icon,
  badge,
}: {
  to: string
  label: string
  Icon: typeof MeIcon
  badge?: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex w-full flex-col items-center gap-0.5 rounded-squircle px-3.5 py-2 text-xs font-extrabold transition-colors ${
          isActive ? 'bg-blue-100 text-blue-500' : 'text-ink-400'
        }`
      }
    >
      <span className="relative">
        <Icon width={22} height={22} />
        {badge && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-aura ring-2 ring-paper" />}
      </span>
      {label}
    </NavLink>
  )
}

export function BottomNav({ hasNewStories }: { hasNewStories?: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-blue-100/70 bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-16px_rgb(38_33_58/0.25)] md:hidden">
      <ul className="mx-auto flex max-w-md items-center px-3 py-2.5">
        <li className="flex-1">
          <NavItem to="/ik" label="Ik" Icon={MeIcon} />
        </li>
        <li className="flex-1">
          <NavItem to="/verhalen" label="Verhalen" Icon={FriendsIcon} badge={hasNewStories} />
        </li>
      </ul>
    </nav>
  )
}
