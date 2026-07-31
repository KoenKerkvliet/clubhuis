import { useNavigate } from 'react-router-dom'
import { TitleHeader } from '@/components/layout/PageHeader'
import { PlayIcon } from '@/components/ui/icons'

export function Games() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-5">
      <TitleHeader title="Spellenhoek" onBack={() => navigate(-1)} />

      <section className="relative overflow-hidden rounded-card bg-blue-100 p-6 shadow-softer">
        <div
          className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-avatar-peach-bg/70"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-10 right-12 h-24 w-24 rounded-full bg-avatar-green-bg/60"
          aria-hidden="true"
        />

        <div className="relative">
          <span className="inline-flex rounded-pill bg-paper px-3 py-1.5 text-xs font-extrabold text-blue-500 shadow-softer">
            Verschijnt binnenkort
          </span>

          <span className="mt-7 flex h-16 w-16 items-center justify-center rounded-card bg-paper text-blue-500 shadow-soft">
            <PlayIcon width={34} height={34} />
          </span>

          <h1 className="mt-5 text-2xl font-extrabold text-ink-900">
            Samen spelen in Clubhuis
          </h1>
          <p className="mt-2 max-w-sm font-semibold leading-relaxed text-ink-500">
            Hier kun je straks een vriend uitnodigen, om de beurt spelen en samen plezier
            maken. Gewoon wanneer het jullie uitkomt.
          </p>
        </div>
      </section>

      <section className="rounded-card bg-paper p-5 shadow-softer">
        <p className="font-extrabold text-ink-900">Nog heel even geduld</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-400">
          We maken de Spellenhoek rustig en veilig klaar. Zodra je hier samen kunt spelen,
          laten we het in Clubhuis weten.
        </p>
      </section>
    </div>
  )
}
