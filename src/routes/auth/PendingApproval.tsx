import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function PendingApproval() {
  const { profile, signOut } = useAuth()

  const isRejectedOrBlocked = profile?.status === 'rejected' || profile?.status === 'blocked'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-blue-50 px-4">
      <Card className="max-w-sm text-center">
        {isRejectedOrBlocked ? (
          <>
            <h1 className="mb-2 text-xl font-bold text-ink-700">Even geduld</h1>
            <p className="text-ink-500">
              Je account kan op dit moment niet gebruikt worden. Neem contact op met een
              beheerder als je denkt dat dit niet klopt.
            </p>
          </>
        ) : (
          <>
            <p className="mb-2 font-hand text-3xl text-purple-600">Welkom bij Clubhuis!</p>
            <h1 className="mb-2 text-xl font-bold text-ink-700">
              Je account wordt bekeken
            </h1>
            <p className="text-ink-500">
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
