// Verwerkt een melding van een gebruiker over een verhaal, reactie of krabbel: zet 'm in
// moderation_events (zichtbaar in het beheerdersportaal onder Moderatie) en stuurt elke actieve
// beheerder een mailtje, want een melding vraagt op dat moment actie — een beheerder moet weten
// dat die moet inloggen op het beheerdersaccount om te beoordelen.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ADMIN_MODERATION_URL = 'https://clubhuis.eu/admin/moderatie'

const TABLE_BY_TYPE: Record<string, string> = {
  story: 'stories',
  comment: 'story_comments',
  scribble: 'scribbles',
}

const TYPE_LABELS: Record<string, string> = {
  story: 'verhaal',
  comment: 'reactie',
  scribble: 'krabbel',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAILIT_API_KEY = Deno.env.get('EMAILIT_API_KEY')!
const EMAILIT_FROM = Deno.env.get('EMAILIT_FROM') || 'Clubhuis <noreply@clubhuis.eu>'
const EMAILIT_REPLY_TO = Deno.env.get('EMAILIT_REPLY_TO') || ''

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendEmail(payload: { to: string; subject: string; html: string; text: string }) {
  const baseHeaders: Record<string, string> = {
    'Auto-Submitted': 'auto-generated',
    'X-Auto-Response-Suppress': 'All',
    'X-Entity-Ref-ID': crypto.randomUUID(),
  }
  const body: Record<string, unknown> = {
    from: EMAILIT_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    headers: baseHeaders,
  }
  if (EMAILIT_REPLY_TO) body.reply_to = EMAILIT_REPLY_TO

  const response = await fetch('https://api.emailit.com/v2/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${EMAILIT_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    console.error('emailit send failed', await response.text())
  }
}

function reportEmailHtml(typeLabel: string, reason: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Nieuwe melding in Clubhuis</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F7F4EF;opacity:0;">
  Een gebruiker heeft een ${typeLabel} gerapporteerd — dit vraagt jouw beoordeling.
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F7F4EF" style="background:#F7F4EF;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;">
  <tr>
    <td bgcolor="#3F739F" style="background:#3F739F;padding:28px 32px;">
      <span style="font-size:20px;font-weight:800;color:#FFFFFF;">Clubhuis</span>
    </td>
  </tr>
  <tr>
    <td style="padding:32px;color:#231F38;font-size:16px;line-height:1.6;">
      <p style="margin:0 0 16px;">Hoi,</p>
      <p style="margin:0 0 24px;">
        Er is zojuist een ${typeLabel} in Clubhuis gerapporteerd. Log in op het beheerdersaccount
        om te bekijken en te beoordelen.
      </p>
      <p style="margin:0 0 24px;padding:16px;background:#F7F4EF;border-radius:12px;color:#6A6378;font-size:14px;">
        ${reason}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td bgcolor="#3F739F" style="border-radius:999px;">
            <a href="${ADMIN_MODERATION_URL}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">Bekijk in Moderatie</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 32px;background:#F7F4EF;color:#6A6378;font-size:12px;text-align:center;">
      (c) ${new Date().getFullYear()} Clubhuis
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function reportEmailText(typeLabel: string, reason: string) {
  return `Hoi,

Er is zojuist een ${typeLabel} in Clubhuis gerapporteerd. Log in op het beheerdersaccount om te bekijken en te beoordelen.

${reason}

${ADMIN_MODERATION_URL}

Met vriendelijke groet,
Clubhuis

--
(c) ${new Date().getFullYear()} Clubhuis | clubhuis.eu`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Niet ingelogd.' }, 401)

  // 1. Wie rapporteert dit? Deze client respecteert RLS, dus alleen content die de melder
  //    zelf mag zien (eigen/vrienden-verhalen) is hierna te vinden.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: caller, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !caller.user) return json({ error: 'Niet ingelogd.' }, 401)

  let body: { content_type?: string; content_id?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400)
  }

  const contentType = body.content_type ?? ''
  const table = TABLE_BY_TYPE[contentType]
  if (!table || !body.content_id) {
    return json({ error: 'Onbekend type of ontbrekend bericht.' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // 2. Bestaat dit bericht en mag de melder het zien?
  const { data: contentRow } = await callerClient.from(table).select('id, author_id').eq('id', body.content_id).maybeSingle()
  if (!contentRow) return json({ error: 'Dit bericht is niet gevonden.' }, 404)

  const { data: reporterProfile } = await admin.from('profiles').select('display_name').eq('id', caller.user.id).maybeSingle()
  const reporterName = reporterProfile?.display_name ?? 'Iemand'
  const userReason = (body.reason ?? '').trim().slice(0, 300)
  const reason = userReason ? `Gerapporteerd door ${reporterName}: ${userReason}` : `Gerapporteerd door ${reporterName}.`

  const { error: insertError } = await admin.from('moderation_events').insert({
    content_type: contentType,
    content_id: body.content_id,
    user_id: (contentRow as { author_id: string | null }).author_id,
    reason,
  })
  if (insertError) return json({ error: 'Melding opslaan lukte niet.' }, 500)

  // 3. Elke actieve beheerder een mailtje — een melding vraagt direct actie.
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'beheerder').eq('status', 'active')
  const typeLabel = TYPE_LABELS[contentType] ?? 'bericht'
  for (const a of admins ?? []) {
    const { data: target } = await admin.auth.admin.getUserById(a.id)
    if (target?.user?.email) {
      await sendEmail({
        to: target.user.email,
        subject: 'Nieuwe melding in Clubhuis',
        html: reportEmailHtml(typeLabel, reason),
        text: reportEmailText(typeLabel, reason),
      })
    }
  }

  return json({ ok: true })
})
