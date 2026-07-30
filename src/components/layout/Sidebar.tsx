import { NavLink } from 'react-router-dom'
import { FriendsIcon, MeIcon, PlusIcon } from '@/components/ui/icons'
import { LogoMark } from '@/components/ui/LogoMark'

function SidebarLink({
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
        `flex items-center gap-3 rounded-squircle px-4 py-3 text-sm font-extrabold transition-colors ${
          isActive ? 'bg-blue-100 text-blue-500' : 'text-ink-400 hover:bg-blue-50'
        }`
      }
    >
      <span className="relative">
        <Icon width={20} height={20} />
        {badge && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-aura ring-2 ring-paper" />}
      </span>
      {label}
    </NavLink>
  )
}

/** Vervangt de BottomNav op tablet/desktop: dezelfde bestemmingen, maar als vaste
 * navigatiekolom zodat de kid-app niet als een uitgerekte telefoon-pagina oogt. */
export function Sidebar({ hasNewStories }: { hasNewStories?: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-blue-100/70 bg-paper px-4 py-6 md:flex">
      <NavLink to="/ik" className="mb-6 flex items-center gap-2 px-2">
        <LogoMark size={28} />
        <span className="text-lg font-extrabold text-ink-900">Clubhuis</span>
      </NavLink>

      <SidebarLink to="/ik" label="Ik" Icon={MeIcon} />
      <SidebarLink to="/vertellen" label="Vertellen" Icon={PlusIcon} />
      <SidebarLink to="/verhalen" label="Verhalen" Icon={FriendsIcon} badge={hasNewStories} />
    </aside>
  )
}
