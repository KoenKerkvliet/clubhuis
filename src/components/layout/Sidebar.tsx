import { NavLink } from 'react-router-dom'
import { FriendsIcon, MeIcon, TellIcon } from '@/components/ui/icons'
import { LogoMark } from '@/components/ui/LogoMark'

function SidebarLink({ to, label, Icon }: { to: string; label: string; Icon: typeof MeIcon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-squircle px-4 py-3 text-sm font-extrabold transition-colors ${
          isActive ? 'bg-blue-100 text-blue-500' : 'text-ink-400 hover:bg-blue-50'
        }`
      }
    >
      <Icon width={20} height={20} />
      {label}
    </NavLink>
  )
}

/** Vervangt de BottomNav op tablet/desktop: dezelfde bestemmingen, maar als vaste
 * navigatiekolom zodat de kid-app niet als een uitgerekte telefoon-pagina oogt. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-blue-100/70 bg-paper px-4 py-6 md:flex">
      <NavLink to="/ik" className="mb-6 flex items-center gap-2 px-2">
        <LogoMark size={28} />
        <span className="text-lg font-extrabold text-ink-900">Clubhuis</span>
      </NavLink>

      <SidebarLink to="/ik" label="Ik" Icon={MeIcon} />

      <NavLink
        to="/vertellen"
        className="my-2 flex items-center gap-3 rounded-squircle bg-blue-500 px-4 py-3 text-sm font-extrabold text-paper transition-transform active:scale-95"
      >
        <TellIcon width={20} height={20} />
        Vertellen
      </NavLink>

      <SidebarLink to="/vrienden" label="Vrienden" Icon={FriendsIcon} />
    </aside>
  )
}
