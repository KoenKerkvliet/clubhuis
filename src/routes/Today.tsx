import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AuraIcon } from '@/components/ui/icons'

interface FeedStory {
  id: string
  text: string
  created_at: string
  author_id: string
  profiles: { username: string; display_name: string; avatar_url: string | null } | null
}

function greeting(hour: number) {
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

export function Today() {
  const { profile } = useAuth()
  const [stories, setStories] = useState<FeedStory[] | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('stories')
      .select('id, text, created_at, author_id, profiles!stories_author_id_fkey(username, display_name, avatar_url)')
      .eq('visibility', 'friends')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active) setStories((data as unknown as FeedStory[]) ?? [])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-ink-500">
          {greeting(new Date().getHours())} {profile?.display_name}
        </p>
        <h1 className="text-xl font-bold text-ink-700">Wat was vandaag jouw mooiste moment?</h1>
      </div>

      <Link to="/vertellen">
        <Button className="w-full">Vertel iets over vandaag</Button>
      </Link>

      <div className="flex flex-col gap-3">
        {stories === null && <p className="text-sm text-ink-500">Even ophalen...</p>}

        {stories?.length === 0 && (
          <Card className="text-center text-ink-500">
            <p>Hier komen straks de verhalen van je vrienden.</p>
          </Card>
        )}

        {stories?.map((story) => (
          <Card key={story.id}>
            <p className="text-sm font-semibold text-purple-700">
              {story.profiles?.display_name ?? 'Onbekend'}
            </p>
            <p className="mt-1 text-ink-700">{story.text}</p>
            <div className="mt-3 flex items-center gap-1 text-aura-600">
              <AuraIcon width={18} height={18} />
              <span className="text-xs font-medium">Aura</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
