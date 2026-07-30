import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)))
}

async function getPublicKey() {
  const { data, error } = await supabase.functions.invoke('badge-push', {
    body: { action: 'public-key' },
  })
  if (error || !data?.publicKey) throw new Error('De pushsleutel kon niet worden opgehaald.')
  return data.publicKey as string
}

export function supportsWebPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function subscribeCurrentDevice(userId: string) {
  if (!supportsWebPush()) throw new Error('Dit apparaat ondersteunt geen achtergrondmeldingen.')

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(await getPublicKey()),
    }))

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Het apparaat gaf geen volledig pushabonnement terug.')
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

export async function unsubscribeCurrentDevice() {
  if (!supportsWebPush()) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}
