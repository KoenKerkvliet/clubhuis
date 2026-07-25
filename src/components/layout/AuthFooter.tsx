import { Link } from 'react-router-dom'

export function AuthFooter() {
  return (
    <footer className="mt-8 flex items-center justify-center gap-3 text-xs font-semibold text-ink-400">
      <Link to="/privacybeleid" className="hover:text-ink-700">
        Privacybeleid
      </Link>
      <span aria-hidden>·</span>
      <span>&copy; {new Date().getFullYear()} Clubhuis</span>
    </footer>
  )
}
