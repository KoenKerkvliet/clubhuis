// Stuurt een wachtwoordherstel-mail namens de beheerder.
//
// Waarom een edge function en niet gewoon vanuit de browser: het e-mailadres van een
// gebruiker hoort volgens de blueprint volledig buiten de app te blijven. Door de opzoeking
// hier server-side met de service role te doen, ziet de beheerder-client nooit een adres —
// die stuurt alleen een profile_id mee.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_REDIRECTS = [
  'https://koenkerkvliet.github.io/clubhuis/',
  'http://localhost:5173/',
]

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

  // 3. Van wie moet het wachtwoord hersteld worden?
  let body: { profile_id?: string; redirect_to?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400)
  }

  if (!body.profile_id) return json({ error: 'profile_id ontbreekt.' }, 400)

  const redirectTo = ALLOWED_REDIRECTS.includes(body.redirect_to ?? '')
    ? body.redirect_to
    : ALLOWED_REDIRECTS[0]

  const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.profile_id)
  if (targetError || !target.user?.email) {
    return json({ error: 'Deze gebruiker is niet gevonden.' }, 404)
  }

  // 4. Laat Supabase de herstelmail sturen. Het adres blijft binnen deze function.
  const { error: resetError } = await callerClient.auth.resetPasswordForEmail(target.user.email, {
    redirectTo,
  })

  if (resetError) return json({ error: resetError.message }, 500)

  return json({ ok: true })
})
