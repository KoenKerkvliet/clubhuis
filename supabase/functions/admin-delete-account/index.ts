// Verwijdert een account definitief: eerst alle foto's (avatar + verhalen) uit storage,
// daarna de auth-gebruiker. Dat laatste cascadeert in de database naar alle gekoppelde
// rijen (verhalen, reacties, aura, krabbels, vriendschappen, meldingen). Alleen toegestaan
// vanuit een gearchiveerd account, zodat verwijderen altijd een bewuste tweede stap is.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function removeAllInFolder(admin: ReturnType<typeof createClient>, bucket: string, folder: string) {
  const { data: files } = await admin.storage.from(bucket).list(folder)
  if (!files || files.length === 0) return
  await admin.storage.from(bucket).remove(files.map((f) => `${folder}/${f.name}`))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Niet ingelogd.' }, 401)

  // 1. Wie vraagt dit aan?
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: caller, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !caller.user) return json({ error: 'Niet ingelogd.' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)

  // 2. Is dat echt een beheerder?
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.user.id)
    .maybeSingle()

  if (callerProfile?.role !== 'beheerder') {
    return json({ error: 'Alleen een beheerder mag dit doen.' }, 403)
  }

  let body: { profile_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400)
  }

  if (!body.profile_id) return json({ error: 'profile_id ontbreekt.' }, 400)
  if (body.profile_id === caller.user.id) {
    return json({ error: 'Je kunt je eigen account niet verwijderen.' }, 400)
  }

  // 3. Alleen een gearchiveerd account mag verwijderd worden — dat maakt verwijderen
  //    altijd een bewuste tweede stap na archiveren, nooit een directe actie.
  const { data: target } = await admin
    .from('profiles')
    .select('id, status')
    .eq('id', body.profile_id)
    .maybeSingle()

  if (!target) return json({ error: 'Deze gebruiker is niet gevonden.' }, 404)
  if (target.status !== 'archived') {
    return json({ error: 'Alleen een gearchiveerd account kan verwijderd worden.' }, 400)
  }

  await removeAllInFolder(admin, 'avatars', body.profile_id)
  await removeAllInFolder(admin, 'story-photos', body.profile_id)

  const { error: deleteError } = await admin.auth.admin.deleteUser(body.profile_id)
  if (deleteError) {
    return json({ error: deleteError.message ?? 'Verwijderen lukte niet.' }, 500)
  }

  return json({ ok: true })
})
