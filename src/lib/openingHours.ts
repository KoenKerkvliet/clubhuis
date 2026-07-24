// Spiegelt public.clubhuis_is_open() uit de migratie: kindaccounts dicht tussen 22:00 en 07:00
// Europe/Amsterdam. Alleen voor de UX-gate hier; de database is de echte grens (RLS).
export function isClubhuisOpen(role: string | undefined): boolean {
  if (role !== 'kind') return true
  const hour = Number(
    new Intl.DateTimeFormat('nl-NL', { hour: 'numeric', hour12: false, timeZone: 'Europe/Amsterdam' }).format(new Date()),
  )
  return hour >= 7 && hour < 22
}
