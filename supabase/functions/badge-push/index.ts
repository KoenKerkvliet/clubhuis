import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@clubhuis.eu'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Niet ingelogd.' }, 401)

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData } = await client.auth.getUser()
  const user = userData.user
  if (!user) return json({ error: 'Niet ingelogd.' }, 401)

  const body = await request.json().catch(() => ({}))
  if (body.action === 'public-key') return json({ publicKey: VAPID_PUBLIC_KEY })
  if (body.action !== 'story' || typeof body.story_id !== 'string') {
    return json({ error: 'Ongeldige aanvraag.' }, 400)
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: story } = await admin
    .from('stories')
    .select('id, author_id, visibility, profiles!stories_author_id_fkey(display_name)')
    .eq('id', body.story_id)
    .maybeSingle()

  if (!story || story.author_id !== user.id) return json({ error: 'Verhaal niet gevonden.' }, 404)
  if (story.visibility !== 'friends') return json({ sent: 0 })

  const { data: friendships } = await admin
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const friendIds = (friendships ?? []).map((friendship) =>
    friendship.requester_id === user.id ? friendship.addressee_id : friendship.requester_id,
  )
  if (!friendIds.length) return json({ sent: 0 })

  const { data: enabledProfiles } = await admin
    .from('profiles')
    .select('id')
    .in('id', friendIds)
    .eq('status', 'active')
    .eq('badges_enabled', true)
  const recipientIds = (enabledProfiles ?? []).map((profile) => profile.id)
  if (!recipientIds.length) return json({ sent: 0 })

  await admin.from('notifications').insert(
    recipientIds.map((userId) => ({
      user_id: userId,
      type: 'new_story',
      payload: { story_id: story.id, from: user.id },
    })),
  )

  const [{ data: subscriptions }, { data: unreadRows }] = await Promise.all([
    admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', recipientIds),
    admin
      .from('notifications')
      .select('user_id')
      .in('user_id', recipientIds)
      .eq('read', false)
      .in('type', ['new_story', 'comment', 'scribble', 'scribble_reply', 'friend_request', 'friend_accepted']),
  ])

  const unreadByUser = new Map<string, number>()
  for (const row of unreadRows ?? []) {
    unreadByUser.set(row.user_id, (unreadByUser.get(row.user_id) ?? 0) + 1)
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  const expiredIds: string[] = []
  let sent = 0
  const authorName = story.profiles?.display_name ?? 'Een vriend'

  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({
            title: 'Nieuw in Clubhuis',
            body: `${authorName} plaatste een nieuw verhaal.`,
            url: '/verhalen',
            badgeCount: unreadByUser.get(subscription.user_id) ?? 1,
          }),
        )
        sent += 1
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) expiredIds.push(subscription.id)
        else console.error('Web Push versturen mislukt', error)
      }
    }),
  )

  if (expiredIds.length) await admin.from('push_subscriptions').delete().in('id', expiredIds)
  return json({ sent })
})
