import { Link, useNavigate } from 'react-router-dom'
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

function TicTacToeArt() {
  const marks = ['×', '', '○', '', '×', '', '○', '', '×']
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-lg border-2 border-avatar-blue-text/50" aria-hidden="true">
      {marks.map((mark, index) => (
        <span
          key={index}
          className="flex h-6 w-6 items-center justify-center border border-avatar-blue-text/30 text-lg font-extrabold leading-none"
        >
          {mark}
        </span>
      ))}
    </div>
  )
}

function DotsAndBoxesArt() {
  return (
    <div className="grid grid-cols-[auto_1.5rem_auto_1.5rem_auto] items-center gap-y-1" aria-hidden="true">
      <span className="h-2 w-2 rounded-full bg-avatar-green-text" />
      <span className="h-1 rounded-full bg-avatar-green-text/60" />
      <span className="h-2 w-2 rounded-full bg-avatar-green-text" />
      <span className="h-1 rounded-full bg-avatar-green-text/60" />
      <span className="h-2 w-2 rounded-full bg-avatar-green-text" />
      <span />
      <span />
      <span className="mx-auto h-6 w-1 rounded-full bg-avatar-green-text/60" />
      <span />
      <span />
      <span className="h-2 w-2 rounded-full bg-avatar-green-text" />
      <span className="h-1 rounded-full bg-avatar-green-text/60" />
      <span className="h-2 w-2 rounded-full bg-avatar-green-text" />
      <span className="h-1 rounded-full bg-avatar-green-text/60" />
      <span className="h-2 w-2 rounded-full bg-avatar-green-text" />
    </div>
  )
}

function BattleshipArt() {
  return (
    <div className="relative h-16 w-20 overflow-hidden rounded-xl bg-blue-200" aria-hidden="true">
      <span className="absolute bottom-3 left-3 h-3 w-12 rounded-b-full bg-blue-700" />
      <span className="absolute bottom-6 left-8 h-4 w-5 rounded-t-md bg-blue-500" />
      <span className="absolute bottom-10 left-10 h-3 w-0.5 bg-blue-700" />
      <span className="absolute bottom-1 left-0 h-0.5 w-full bg-paper/80" />
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
    path: '/spellen/galgje',
  },
  {
    title: 'Memory',
    className: 'bg-avatar-peach-bg text-avatar-peach-text',
    artwork: <MemoryArt />,
  },
  {
    title: 'Boter-kaas-en-eieren',
    className: 'bg-avatar-blue-bg text-avatar-blue-text',
    artwork: <TicTacToeArt />,
  },
  {
    title: 'Stippen en vakjes',
    className: 'bg-avatar-green-bg text-avatar-green-text',
    artwork: <DotsAndBoxesArt />,
  },
  {
    title: 'Zeeslag',
    className: 'bg-avatar-blue-bg text-avatar-blue-text',
    artwork: <BattleshipArt />,
  },
]

export function Games() {
  const navigate = useNavigate()
  const sortedGames = [...games].sort((a, b) =>
    a.title.localeCompare(b.title, 'nl', { numeric: true }),
  )

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
          {sortedGames.map((game) => {
            const content = (
              <>
                <span className="self-start rounded-pill bg-paper/80 px-2.5 py-1 text-[11px] font-extrabold">
                  {game.path ? 'Speel nu' : 'Binnenkort'}
                </span>
                <div className="my-4 flex min-h-14 items-center justify-center">{game.artwork}</div>
                <h3 className="text-center font-extrabold">{game.title}</h3>
              </>
            )

            return game.path ? (
              <Link
                key={game.title}
                to={game.path}
                className={`flex min-h-44 flex-col justify-between rounded-card p-4 shadow-softer transition-transform active:scale-[0.98] ${game.className}`}
              >
                {content}
              </Link>
            ) : (
              <article
                key={game.title}
                className={`flex min-h-44 flex-col justify-between rounded-card p-4 shadow-softer ${game.className}`}
              >
                {content}
              </article>
            )
          })}
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
