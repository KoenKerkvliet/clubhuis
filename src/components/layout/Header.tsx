import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'
import { LogoMark } from '@/components/ui/LogoMark'
import { BellIcon, ShareIcon } from '@/components/ui/icons'

export function Header() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasNotifications, setHasNotifications] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('read', false)
      .then(({ count }) => setHasNotifications(!!count))
  }, [profile])

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-blue-100/70 bg-cream/95 px-4 py-3 backdrop-blur md:justify-end md:px-8">
      <Link to="/ik" className="flex items-center gap-2 md:hidden">
        <LogoMark size={26} />
        <span className="text-lg font-extrabold text-ink-900">Clubhuis</span>
      </Link>

      <div className="flex items-center gap-2">
        <IconButton onClick={() => navigate('/meldingen')} badge={hasNotifications} aria-label="Meldingen">
          <BellIcon width={18} height={18} />
        </IconButton>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Profielmenu"
            className="block rounded-squircle transition-transform active:scale-95"
          >
            <Avatar name={profile?.display_name ?? '?'} avatarPath={profile?.avatar_url} size={40} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-30 w-48 rounded-card bg-paper p-2 shadow-soft">
              <p className="truncate px-3 py-2 text-sm font-extrabold text-ink-900">{profile?.display_name}</p>
              <Link
                to="/profiel"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-bold text-ink-700 transition-colors hover:bg-blue-50"
              >
                Profiel
              </Link>
              <Link
                to="/delen"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-ink-700 transition-colors hover:bg-blue-50"
              >
                <ShareIcon width={16} height={16} />
                Delen
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-warn-text transition-colors hover:bg-warn-bg"
              >
                Uitloggen
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
