import { LogoMark } from '@/components/ui/LogoMark'

/** Vervangt kale "Even ophalen..."-tekst door het beeldmerk met een rustige ademhaling —
 * voelt minder als een kapotte pagina tijdens het wachten op een tragere verbinding. */
export function LoadingState({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-6 text-ink-400 ${className}`}>
      <LogoMark size={22} className="animate-pulse" />
      <span className="text-sm font-semibold">Even ophalen...</span>
    </div>
  )
}
