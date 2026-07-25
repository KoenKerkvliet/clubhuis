// Vervangt supabase.auth.resetPasswordForEmail(). Geeft altijd hetzelfde antwoord terug,
// ongeacht of het adres bestaat — anders kun je via deze route uitvinden welke
// e-mailadressen bij Clubhuis geregistreerd staan.
//
// emailit-helper staat bewust inline, zie send-verification-email/index.ts voor uitleg.

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

function resetEmailHtml(link: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Wachtwoord opnieuw instellen</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F7F4EF;opacity:0;">
  Kies een nieuw wachtwoord voor je Clubhuis-account.
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
        Er is een nieuw wachtwoord aangevraagd voor jouw Clubhuis-account. Klik op de knop
        hieronder om een nieuw wachtwoord te kiezen.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td bgcolor="#3F739F" style="border-radius:999px;">
            <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">Kies nieuw wachtwoord</a>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#6A6378;">
        Vroeg jij dit niet aan? Dan kun je deze mail gewoon negeren — er verandert niets.
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#6A6378;">
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

function resetEmailText(link: string) {
  return `Hoi,

Er is een nieuw wachtwoord aangevraagd voor jouw Clubhuis-account. Kies via de link hieronder een nieuw wachtwoord.

${link}

Vroeg jij dit niet aan? Dan kun je deze mail gewoon negeren, er verandert niets.

Met vriendelijke groet,
Clubhuis

--
(c) ${new Date().getFullYear()} Clubhuis | clubhuis.eu`
}

interface RequestBody {
  email?: string
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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: body.redirectTo },
  })

  if (!error && data?.properties?.action_link) {
    try {
      await sendEmail({
        to: email,
        subject: 'Wachtwoord opnieuw instellen',
        html: resetEmailHtml(data.properties.action_link),
        text: resetEmailText(data.properties.action_link),
      })
    } catch (err) {
      console.error('emailit send failed', err)
      // Bewust geen foutmelding teruggeven: zie boven.
    }
  }

  return json({ success: true })
})
