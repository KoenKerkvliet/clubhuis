import { Card } from '@/components/ui/Card'
import { PlayIcon } from '@/components/ui/icons'

export function Play() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-ink-700">Spelen</h1>
      <Card className="flex flex-col items-center gap-3 py-10 text-center text-ink-500">
        <PlayIcon width={40} height={40} className="text-purple-400" />
        <p className="font-medium text-ink-700">Binnenkort: samen spelen met je vrienden</p>
        <p className="text-sm">Zoals Draw It — altijd met mensen die je al kent.</p>
      </Card>
    </div>
  )
}
