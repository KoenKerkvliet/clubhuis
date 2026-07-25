// Stuurt namens een ingelogd lid een uitnodiging naar iemand die nog geen Clubhuis-account
// heeft — bijvoorbeeld opa of oma. Alleen uitleg + een link naar de registratiepagina, er
// wordt hier zelf geen account aangemaakt (dat gebeurt pas als de uitgenodigde zich echt
// registreert via send-verification-email).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const REGISTER_URL = 'https://clubhuis.eu/registreren'

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
    throw new Error(`EmailIt API error: ${response.status} ${await response.text()}`)
  }
}

function inviteEmailHtml(inviterName: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Uitnodiging voor Clubhuis</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F7F4EF;opacity:0;">
  ${inviterName} nodigt je uit voor Clubhuis, een veilig herinneringenboek voor familie en vrienden.
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
      <p style="margin:0 0 16px;">
        <strong>${inviterName}</strong> nodigt je uit voor Clubhuis: een veilig, besloten
        herinneringenboek waar alleen familie en echte vrienden bij kunnen — geen vreemden,
        geen reclame, geen eindeloze feed.
      </p>
      <p style="margin:0 0 24px;">
        Klik op de knop hieronder om een account te maken. Kies een gebruikersnaam en
        wachtwoord; daarna keurt een beheerder je account goed en kun je meteen mee met
        ${inviterName} en de rest.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td bgcolor="#3F739F" style="border-radius:999px;">
            <a href="${REGISTER_URL}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">Account aanmaken</a>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#6A6378;">
        Werkt de knop niet? Kopieer deze link in je browser:<br>
        <a href="${REGISTER_URL}" style="color:#3F739F;word-break:break-all;">${REGISTER_URL}</a>
      </p>
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

function inviteEmailText(inviterName: string) {
  return `Hoi,

${inviterName} nodigt je uit voor Clubhuis: een veilig, besloten herinneringenboek waar alleen familie en echte vrienden bij kunnen — geen vreemden, geen reclame, geen eindeloze feed.

Maak een account via de link hieronder. Kies een gebruikersnaam en wachtwoord; daarna keurt een beheerder je account goed en kun je meteen mee met ${inviterName} en de rest.

${REGISTER_URL}

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

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: caller, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !caller.user) return json({ error: 'Niet ingelogd.' }, 401)

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Vul een geldig e-mailadres in.' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // Alleen een goedgekeurd lid mag uitnodigen — een net aangemeld, nog niet beoordeeld
  // account is zelf nog niet officieel lid van de kring.
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('display_name, status')
    .eq('id', caller.user.id)
    .maybeSingle()

  if (callerProfile?.status !== 'active') {
    return json({ error: 'Je account moet eerst goedgekeurd zijn om iemand uit te nodigen.' }, 403)
  }

  const inviterName = callerProfile?.display_name ?? 'Een lid van Clubhuis'

  try {
    await sendEmail({
      to: email,
      subject: `${inviterName} nodigt je uit voor Clubhuis`,
      html: inviteEmailHtml(inviterName),
      text: inviteEmailText(inviterName),
    })
  } catch (err) {
    console.error('emailit send failed', err)
    return json({ error: 'De uitnodiging kon niet worden verstuurd. Probeer het nog eens.' }, 500)
  }

  return json({ ok: true })
})
