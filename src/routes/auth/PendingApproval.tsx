import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function PendingApproval() {
  const { profile, signOut } = useAuth()

  const isUnavailable =
    profile?.status === 'rejected' || profile?.status === 'blocked' || profile?.status === 'archived'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-4">
      <Card className="max-w-sm text-center">
        {isUnavailable ? (
          <>
            <h1 className="mb-2 text-xl font-bold text-ink-900">Even geduld</h1>
            <p className="text-ink-400">
              Je account kan op dit moment niet gebruikt worden. Neem contact op met een
              beheerder als je denkt dat dit niet klopt.
            </p>
          </>
        ) : (
          <>
            <p className="mb-2 font-hand text-3xl text-blue-500">Welkom bij Clubhuis!</p>
            <h1 className="mb-2 text-xl font-bold text-ink-900">
              Je account wordt bekeken
            </h1>
            <p className="text-ink-400">
              Een beheerder controleert je account. Zodra dat gelukt is, kun je vrienden zoeken
              en je eerste verhaal vertellen. Dit duurt meestal niet lang.
            </p>
          </>
        )}
        <Button variant="ghost" className="mt-6" onClick={() => signOut()}>
          Uitloggen
        </Button>
      </Card>
    </div>
  )
}
