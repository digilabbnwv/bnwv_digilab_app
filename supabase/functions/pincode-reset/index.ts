/**
 * Supabase Edge Function: pincode-reset
 *
 * "Pincode vergeten"-flow voor de custom pincode-auth:
 *   - actie 'aanvragen'   { email }            → mailt een eenmalige resetlink
 *   - actie 'controleren' { token }            → { geldig: boolean }
 *   - actie 'herstellen'  { token, pincode }   → zet de nieuwe pincode
 *
 * Beveiliging:
 *   - het token (32 willekeurige bytes) gaat alleen per e-mail naar de
 *     medewerker; in de database staat uitsluitend de SHA-256-hash
 *   - token is TOKEN_GELDIG_MINUTEN geldig en eenmalig te gebruiken
 *   - 'aanvragen' antwoordt altijd hetzelfde, zodat niet af te leiden is
 *     welke e-mailadressen een account hebben
 *   - de link in de mail wordt gebouwd uit het secret APP_BASE_URL, nooit uit
 *     invoer van de client (anders kan iemand een resetlink naar een eigen
 *     domein laten mailen en zo het token onderscheppen)
 *   - eenvoudige rate-limit: max. één mail per medewerker per WACHTTIJD_MINUTEN
 *
 * Deploy zonder JWT-verificatie (de gebruiker is juist níet ingelogd):
 *   supabase functions deploy pincode-reset --no-verify-jwt
 *
 * Secrets (instellen via: supabase secrets set ...):
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — queries die RLS negeren
 *   APP_BASE_URL           — bijv. https://digilabbnwv.github.io/bnwv_digilab_app/
 *   WEBHOOK_URL_PINCODE    — optioneel; Power Automate flow die de mail verstuurt.
 *                            Valt terug op WEBHOOK_URL_MELDINGEN (zelfde
 *                            `berichten`-formaat, dus dezelfde flow werkt).
 *   DIGILAB_WEBHOOK_SECRET — meegestuurd als header naar Power Automate
 *   TOEGESTANE_ORIGIN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_BASE_URL           = Deno.env.get('APP_BASE_URL')
const WEBHOOK_URL            = Deno.env.get('WEBHOOK_URL_PINCODE') ?? Deno.env.get('WEBHOOK_URL_MELDINGEN')
const DIGILAB_WEBHOOK_SECRET = Deno.env.get('DIGILAB_WEBHOOK_SECRET')
const TOEGESTANE_ORIGIN      = Deno.env.get('TOEGESTANE_ORIGIN') ?? '*'

const TOKEN_GELDIG_MINUTEN = 60
const WACHTTIJD_MINUTEN    = 2

const TOEGESTANE_ACTIES = ['aanvragen', 'controleren', 'herstellen'] as const
type Actie = typeof TOEGESTANE_ACTIES[number]

interface Payload {
  actie: Actie
  email?: string
  token?: string
  pincode?: string
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  TOEGESTANE_ORIGIN === '*' ? '*' : TOEGESTANE_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function escapeHtml(tekst: string): string {
  return tekst.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function sha256Hex(tekst: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tekst))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Moet identiek blijven aan hashPin in src/lib/auth.js. */
function hashPin(pin: string): Promise<string> {
  return sha256Hex(pin + 'digilab_salt_2026')
}

function genereerToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function resetLink(token: string): string | null {
  if (!APP_BASE_URL) return null
  try {
    const base = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`
    const url = new URL('pincode-herstellen', base)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    url.searchParams.set('token', token)
    return url.toString()
  } catch {
    return null
  }
}

function mailHtml(naam: string, link: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a; max-width:620px;">
      <h1 style="font-size:20px; color:#E8772E;">Nieuwe pincode instellen</h1>
      <p style="font-size:14px;">Hoi ${escapeHtml(naam)},</p>
      <p style="font-size:14px;">Er is gevraagd om de pincode van je Digilab-account opnieuw in te stellen.
        Klik op de knop hieronder om een nieuwe pincode te kiezen. De link is
        ${TOKEN_GELDIG_MINUTEN} minuten geldig en werkt maar één keer.</p>
      <p style="margin:20px 0;">
        <a href="${escapeHtml(link)}" style="background:#E8772E; color:#fff; padding:10px 18px;
          border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
          Nieuwe pincode instellen
        </a>
      </p>
      <p style="font-size:12px; color:#666;">Of kopieer deze link: ${escapeHtml(link)}</p>
      <p style="font-size:14px;">Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren;
        je huidige pincode blijft gewoon werken.</p>
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
      <p style="font-size:12px; color:#999;">Digilab BNWV — automatische notificatie, niet beantwoorden.</p>
    </div>`
}

type Admin = ReturnType<typeof createClient>

/** Zoekt een geldig (ongebruikt, niet verlopen) token op. */
async function zoekGeldigToken(supabaseAdmin: Admin, token: string) {
  const { data } = await supabaseAdmin
    .from('pincode_resets')
    .select('id, medewerker_id')
    .eq('token_hash', await sha256Hex(token))
    .is('gebruikt_op', null)
    .gt('verloopt_op', new Date().toISOString())
    .maybeSingle()
  return data as { id: string, medewerker_id: string } | null
}

async function aanvragen(supabaseAdmin: Admin, emailInvoer: string): Promise<Response> {
  // Altijd hetzelfde antwoord, ongeacht of het adres bestaat.
  const neutraal = json({ ok: true }, 200)

  if (!APP_BASE_URL || !WEBHOOK_URL || !DIGILAB_WEBHOOK_SECRET) {
    console.error('[pincode-reset] APP_BASE_URL, WEBHOOK_URL_PINCODE/WEBHOOK_URL_MELDINGEN of DIGILAB_WEBHOOK_SECRET ontbreekt')
    return json({ fout: 'Server configuratiefout' }, 500)
  }

  const email = emailInvoer.toLowerCase().trim()
  const { data: medewerker } = await supabaseAdmin
    .from('medewerkers')
    .select('id, naam, email, gearchiveerd')
    .eq('email', email)
    .maybeSingle()

  if (!medewerker || medewerker.gearchiveerd) {
    console.log('[pincode-reset] Aanvraag voor onbekend of gedeactiveerd adres — geen mail verstuurd')
    return neutraal
  }

  // Rate-limit: niet vaker dan eens per WACHTTIJD_MINUTEN een mail.
  const grens = new Date(Date.now() - WACHTTIJD_MINUTEN * 60_000).toISOString()
  const { count } = await supabaseAdmin
    .from('pincode_resets')
    .select('id', { count: 'exact', head: true })
    .eq('medewerker_id', medewerker.id)
    .gt('aangemaakt_op', grens)
  if ((count ?? 0) > 0) {
    console.log(`[pincode-reset] Rate-limit — medewerker=${medewerker.id}`)
    return neutraal
  }

  // Oudere, nog openstaande tokens ongeldig maken: alleen de nieuwste link werkt.
  const nu = new Date().toISOString()
  await supabaseAdmin
    .from('pincode_resets')
    .update({ gebruikt_op: nu })
    .eq('medewerker_id', medewerker.id)
    .is('gebruikt_op', null)

  const token = genereerToken()
  const { error: insertError } = await supabaseAdmin.from('pincode_resets').insert([{
    medewerker_id: medewerker.id,
    token_hash: await sha256Hex(token),
    verloopt_op: new Date(Date.now() + TOKEN_GELDIG_MINUTEN * 60_000).toISOString(),
  }])
  if (insertError) {
    console.error('[pincode-reset] Token opslaan mislukt:', insertError.message)
    return json({ fout: 'Aanvraag kon niet worden verwerkt' }, 500)
  }

  const link = resetLink(token)
  if (!link) {
    console.error('[pincode-reset] APP_BASE_URL is geen geldige URL')
    return json({ fout: 'Server configuratiefout' }, 500)
  }

  const payload = {
    type: 'pincode_reset',
    actie: 'aanvragen',
    berichten: [{
      email: medewerker.email,
      onderwerp: 'Digilab: nieuwe pincode instellen',
      html_body: mailHtml(medewerker.naam, link),
    }],
    gegenereerd_op: nu,
  }

  try {
    const paResp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-digilab-secret': DIGILAB_WEBHOOK_SECRET },
      body: JSON.stringify(payload),
    })
    if (!paResp.ok) {
      console.error('[pincode-reset] Power Automate fout:', paResp.status, await paResp.text())
      return json({ fout: 'E-mail verzenden mislukt' }, 502)
    }
  } catch (err) {
    console.error('[pincode-reset] Power Automate aanroep mislukt:', err)
    return json({ fout: 'E-mailservice niet bereikbaar' }, 502)
  }

  console.log(`[pincode-reset] Resetmail verstuurd — medewerker=${medewerker.id}`)
  return neutraal
}

async function herstellen(supabaseAdmin: Admin, token: string, pincode: string): Promise<Response> {
  if (!/^\d{5}$/.test(pincode)) return json({ fout: 'De pincode moet uit 5 cijfers bestaan' }, 400)

  // Token atomair "claimen": alleen de eerste aanroep krijgt een rij terug.
  const { data: geclaimd } = await supabaseAdmin
    .from('pincode_resets')
    .update({ gebruikt_op: new Date().toISOString() })
    .eq('token_hash', await sha256Hex(token))
    .is('gebruikt_op', null)
    .gt('verloopt_op', new Date().toISOString())
    .select('medewerker_id')
    .maybeSingle()

  if (!geclaimd) return json({ fout: 'Deze link is ongeldig of verlopen. Vraag een nieuwe aan.' }, 400)

  const { error } = await supabaseAdmin
    .from('medewerkers')
    .update({ pincode_hash: await hashPin(pincode) })
    .eq('id', geclaimd.medewerker_id)
    .eq('gearchiveerd', false)
  if (error) {
    console.error('[pincode-reset] Pincode bijwerken mislukt:', error.message)
    return json({ fout: 'Pincode kon niet worden opgeslagen' }, 500)
  }

  console.log(`[pincode-reset] Pincode hersteld — medewerker=${geclaimd.medewerker_id}`)
  return json({ ok: true }, 200)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() })
  if (req.method !== 'POST') return json({ fout: 'Methode niet toegestaan' }, 405)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('[pincode-reset] SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt')
    return json({ fout: 'Server configuratiefout' }, 500)
  }

  let body: Payload
  try {
    body = await req.json()
  } catch {
    return json({ fout: 'Ongeldige JSON' }, 400)
  }

  if (!TOEGESTANE_ACTIES.includes(body.actie)) {
    return json({ fout: `Ongeldige actie. Toegestaan: ${TOEGESTANE_ACTIES.join(', ')}` }, 400)
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  if (body.actie === 'aanvragen') {
    if (!body.email || typeof body.email !== 'string') return json({ fout: 'E-mailadres ontbreekt' }, 400)
    return aanvragen(supabaseAdmin, body.email)
  }

  if (!body.token || typeof body.token !== 'string') return json({ fout: 'Token ontbreekt' }, 400)

  if (body.actie === 'controleren') {
    return json({ geldig: !!(await zoekGeldigToken(supabaseAdmin, body.token)) }, 200)
  }

  return herstellen(supabaseAdmin, body.token, String(body.pincode ?? ''))
})
