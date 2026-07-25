import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { AuraPill, CommentPill } from '@/components/ui/Pill'
import { StoryPhoto } from '@/components/story/StoryPhoto'
import { TellIcon } from '@/components/ui/icons'

interface FeedStory {
  id: string
  text: string
  photo_path: string | null
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
      .select(
        'id, text, photo_path, created_at, author_id, profiles!stories_author_id_fkey(username, display_name, avatar_url)',
      )
      .eq('visibility', 'friends')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active) setStories((data as unknown as FeedStory[]) ?? [])
      })

    return () => {
      active = false
    }
  }, [profile])

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card bg-blue-100 p-6">
        <p className="font-bold text-blue-500">
          {greeting(new Date().getHours())} {profile?.display_name}.
        </p>
        <p className="mt-1 text-2xl font-extrabold leading-snug text-ink-900">
          Wat was vandaag jouw mooiste moment?
        </p>
        <Link to="/vertellen">
          <Button className="mt-5 w-full justify-start px-6">
            <TellIcon width={18} height={18} />
            Vertel iets over vandaag
          </Button>
        </Link>
      </div>

      <p className="text-sm font-extrabold uppercase tracking-wide text-ink-400">
        Verhalen van vrienden
      </p>

      <div className="flex flex-col gap-4">
        {stories === null && <p className="text-sm text-ink-400">Even ophalen...</p>}

        {stories?.length === 0 && (
          <Card className="text-center text-ink-400">
            <p>Hier komen straks de verhalen van je vrienden.</p>
          </Card>
        )}

        {stories?.map((story) => (
          <Card key={story.id}>
            <div className="flex items-center gap-3">
              <Avatar name={story.profiles?.display_name ?? '?'} avatarPath={story.profiles?.avatar_url} size={40} />
              <div>
                <p className="font-extrabold text-ink-900">{story.profiles?.display_name ?? 'Onbekend'}</p>
                <p className="text-xs font-semibold text-ink-400">
                  {new Date(story.created_at).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <p className="mt-3 text-ink-700">{story.text}</p>
            {story.photo_path && <StoryPhoto path={story.photo_path} />}
            <div className="mt-4 flex items-center gap-2">
              <AuraPill />
              <CommentPill count={0} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
