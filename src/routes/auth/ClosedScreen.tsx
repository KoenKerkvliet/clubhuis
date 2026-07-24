import { useAuth } from '@/context/AuthContext'
import { MoonIcon } from '@/components/ui/icons'

export function ClosedScreen() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-night-bg px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-squircle bg-night-badge">
        <MoonIcon width={32} height={32} className="text-night-icon" />
      </div>
      <h1 className="text-3xl font-extrabold text-paper">
        Het Clubhuis
        <br />
        slaapt even
      </h1>
      <p className="max-w-xs text-night-text">
        We zijn elke dag open van 07:00 tot 22:00. Morgenochtend staan je verhalen er weer precies zo.
      </p>
      <p className="font-hand text-2xl text-night-icon">Slaap lekker, {profile?.display_name}</p>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-6 rounded-pill bg-night-badge px-8 py-3.5 font-extrabold text-night-icon"
      >
        Sluiten
      </button>
    </div>
  )
}
