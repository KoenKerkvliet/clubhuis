import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface OwnStory {
  id: string
  text: string
  visibility: 'private' | 'friends'
  created_at: string
}

export function Me() {
  const { profile, signOut } = useAuth()
  const [stories, setStories] = useState<OwnStory[]>([])

  useEffect(() => {
    if (!profile) return
    supabase
      .from('stories')
      .select('id, text, visibility, created_at')
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setStories(data ?? []))
  }, [profile])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-2xl font-bold text-purple-600">
          {profile?.display_name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink-700">{profile?.display_name}</h1>
          <p className="text-sm text-ink-500">@{profile?.username}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-500">Mijn plekje</h2>
        {stories.length === 0 && (
          <Card className="text-center text-ink-500">Hier komen jouw eigen verhalen.</Card>
        )}
        <div className="flex flex-col gap-3">
          {stories.map((story) => (
            <Card key={story.id}>
              <p className="text-ink-700">{story.text}</p>
              <p className="mt-2 text-xs text-ink-500">
                {story.visibility === 'private' ? 'Alleen voor mij' : 'Mijn vrienden'}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <Button variant="ghost" onClick={() => signOut()}>
        Uitloggen
      </Button>
    </div>
  )
}
