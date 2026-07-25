// Vervangt Supabase's ingebouwde (traaggelimiteerde) bevestigingsmail bij registratie.
// Maakt het account server-side aan via generateLink en verstuurt de link zelf via emailit.
// Werkt ook voor "stuur opnieuw": als het account al bestaat maar nog niet bevestigd is,
// geeft generateLink gewoon een nieuwe link voor datzelfde account terug.
//
// emailit-helper staat hier bewust inline (niet in een gedeeld bestand): cross-function
// relative imports bleken niet op te lossen in de manier waarop deze functions gedeployed
// worden, en het is toch al maar een paar regels per keer.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAILIT_API_KEY = Deno.env.get('EMAILIT_API_KEY')!
const EMAILIT_FROM = Deno.env.get('EMAILIT_FROM') || 'Clubhuis <noreply@clubhuis.eu>'
const EMAILIT_REPLY_TO = Deno.env.get('EMAILIT_REPLY_TO') || ''

interface EmailitPayload {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

async function sendEmail(payload: EmailitPayload): Promise<void> {
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
    headers: { ...baseHeaders, ...(payload.headers || {}) },
  }
  if (EMAILIT_REPLY_TO) body.reply_to = EMAILIT_REPLY_TO

  const response = await fetch('https://api.emailit.com/v2/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${EMAILIT_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`EmailIt API error: ${response.status} ${errorText}`)
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function verificationEmailHtml(link: string, name: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Bevestig je e-mailadres</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F7F4EF;opacity:0;">
  Nog één stap: bevestig je e-mailadres om te starten met Clubhuis.
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
      <p style="margin:0 0 16px;">Hoi ${name},</p>
      <p style="margin:0 0 24px;">
        Welkom bij Clubhuis! Klik op de knop hieronder om je e-mailadres te bevestigen.
        Daarna bekijkt een beheerder je account, en kun je daarna in.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td bgcolor="#3F739F" style="border-radius:999px;">
            <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">Bevestig e-mailadres</a>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#6A6378;">
        Werkt de knop niet? Kopieer deze link in je browser:<br>
        <a href="${link}" style="color:#3F739F;word-break:break-all;">${link}</a>
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

function verificationEmailText(link: string, name: string) {
  return `Hoi ${name},

Welkom bij Clubhuis! Bevestig je e-mailadres via de link hieronder. Daarna bekijkt een beheerder je account, en kun je daarna in.

${link}

Met vriendelijke groet,
Clubhuis

--
(c) ${new Date().getFullYear()} Clubhuis | clubhuis.eu`
}

const ADMIN_ACCOUNTS_URL = 'https://clubhuis.eu/admin/accounts'

function newSignupEmailHtml(name: string, username: string, email: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Nieuwe aanmelding bij Clubhuis</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F7F4EF;opacity:0;">
  Er heeft zich zojuist iemand nieuw aangemeld — beoordeel het account.
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
        Er heeft zich zojuist iemand nieuw aangemeld bij Clubhuis. Zodra het e-mailadres
        bevestigd is, staat het account klaar om te beoordelen.
      </p>
      <p style="margin:0 0 24px;padding:16px;background:#F7F4EF;border-radius:12px;color:#6A6378;font-size:14px;">
        ${name} (@${username})<br>${email}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td bgcolor="#3F739F" style="border-radius:999px;">
            <a href="${ADMIN_ACCOUNTS_URL}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">Bekijk in Accounts</a>
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

function newSignupEmailText(name: string, username: string, email: string) {
  return `Hoi,

Er heeft zich zojuist iemand nieuw aangemeld bij Clubhuis. Zodra het e-mailadres bevestigd is, staat het account klaar om te beoordelen.

${name} (@${username})
${email}

${ADMIN_ACCOUNTS_URL}

Met vriendelijke groet,
Clubhuis

--
(c) ${new Date().getFullYear()} Clubhuis | clubhuis.eu`
}

async function notifyAdminsOfNewSignup(admin: ReturnType<typeof createClient>, name: string, username: string, email: string) {
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'beheerder').eq('status', 'active')
  for (const a of (admins ?? []) as { id: string }[]) {
    const { data: target } = await admin.auth.admin.getUserById(a.id)
    if (target?.user?.email) {
      await sendEmail({
        to: target.user.email,
        subject: 'Nieuwe aanmelding bij Clubhuis',
        html: newSignupEmailHtml(name, username, email),
        text: newSignupEmailText(name, username, email),
      })
    }
  }
}

interface RequestBody {
  email?: string
  password?: string
  username?: string
  display_name?: string
  redirectTo?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) return json({ error: 'E-mailadres ontbreekt.' }, 400)

  if (body.username && !/^[a-z0-9_]{3,20}$/.test(body.username)) {
    return json({ error: 'Gebruikersnaam mag alleen kleine letters, cijfers en _ bevatten (3-20 tekens).' }, 400)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    // @ts-ignore -- password is optioneel wanneer het account al bestaat (resend-pad).
    password: body.password,
    options: {
      data: body.username
        ? { username: body.username, display_name: body.display_name || body.username }
        : undefined,
      redirectTo: body.redirectTo,
    },
  })

  if (error || !data?.properties?.action_link) {
    return json({ error: error?.message ?? 'Registreren lukte niet.' }, 400)
  }

  const name = (data.user?.user_metadata?.display_name as string | undefined) || body.display_name || 'daar'

  try {
    await sendEmail({
      to: email,
      subject: 'Bevestig je e-mailadres',
      html: verificationEmailHtml(data.properties.action_link, name),
      text: verificationEmailText(data.properties.action_link, name),
    })
  } catch (err) {
    console.error('emailit send failed', err)
    return json({ error: 'De bevestigingsmail kon niet worden verstuurd. Probeer het nog eens.' }, 500)
  }

  // Alleen bij een echte nieuwe registratie (username wordt alleen door signUp meegestuurd,
  // niet door "stuur opnieuw") een beheerder waarschuwen — dat vraagt namelijk beoordeling.
  if (body.username) {
    try {
      await notifyAdminsOfNewSignup(admin, name, body.username, email)
    } catch (err) {
      console.error('admin notify failed', err)
    }
  }

  return json({ success: true })
})
