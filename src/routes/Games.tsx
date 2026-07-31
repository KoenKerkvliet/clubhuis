import { useNavigate } from 'react-router-dom'
import { TitleHeader } from '@/components/layout/PageHeader'
import { PencilIcon, PlayIcon } from '@/components/ui/icons'

function FourInARowArt() {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl bg-blue-500 p-2" aria-hidden="true">
      {['bg-paper', 'bg-aura', 'bg-paper', 'bg-avatar-peach-bg', 'bg-aura', 'bg-paper', 'bg-avatar-peach-bg', 'bg-aura'].map(
        (color, index) => <span key={index} className={`h-3.5 w-3.5 rounded-full ${color}`} />,
      )}
    </div>
  )
}

function DrawArt() {
  return (
    <div className="relative flex h-14 w-20 items-center justify-center rounded-xl bg-paper/80" aria-hidden="true">
      <span className="absolute left-3 top-3 h-5 w-8 rotate-[-8deg] rounded-full border-2 border-avatar-green-text" />
      <PencilIcon className="absolute bottom-2 right-2 rotate-[-18deg] text-aura-text" width={29} height={29} />
    </div>
  )
}

function WordArt() {
  return (
    <div className="flex flex-col items-center gap-2" aria-hidden="true">
      <span className="font-hand text-2xl font-semibold text-avatar-sand-text">?</span>
      <span className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="h-0.5 w-4 rounded-full bg-avatar-sand-text/70" />
        ))}
      </span>
    </div>
  )
}

function MemoryArt() {
  return (
    <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
      {['bg-blue-500', 'bg-aura', 'bg-avatar-green-text', 'bg-aura', 'bg-blue-500', 'bg-avatar-green-text'].map(
        (color, index) => <span key={index} className={`h-7 w-6 rounded-md ${color} shadow-softer`} />,
      )}
    </div>
  )
}

const games = [
  {
    title: '4 op een rij',
    className: 'bg-avatar-blue-bg text-avatar-blue-text',
    artwork: <FourInARowArt />,
  },
  {
    title: 'Draw it',
    className: 'bg-avatar-green-bg text-avatar-green-text',
    artwork: <DrawArt />,
  },
  {
    title: 'Galgje',
    className: 'bg-avatar-sand-bg text-avatar-sand-text',
    artwork: <WordArt />,
  },
  {
    title: 'Memory',
    className: 'bg-avatar-peach-bg text-avatar-peach-text',
    artwork: <MemoryArt />,
  },
]

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

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-ink-900">Straks in de Spellenhoek</h2>
        <div className="grid grid-cols-2 gap-3">
          {games.map((game) => (
            <article
              key={game.title}
              className={`flex min-h-44 flex-col justify-between rounded-card p-4 shadow-softer ${game.className}`}
            >
              <span className="self-start rounded-pill bg-paper/80 px-2.5 py-1 text-[11px] font-extrabold">
                Binnenkort
              </span>
              <div className="my-4 flex min-h-14 items-center justify-center">{game.artwork}</div>
              <h3 className="text-center font-extrabold">{game.title}</h3>
            </article>
          ))}
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
