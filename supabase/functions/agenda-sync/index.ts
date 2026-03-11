/**
 * Supabase Edge Function: agenda-sync
 *
 * Ontvangt een reserveringsgebeurtenis vanuit de React-app en stuurt die
 * veilig door naar de Power Automate webhook die de Outlook-agenda bijwerkt.
 *
 * Beveiliging:
 *  - Alleen aanroepen met een geldig Supabase JWT (ingelogde medewerker)
 *  - Webhook URL staat uitsluitend in Supabase secrets, nooit in de frontend
 *  - Power Automate webhook heeft ingebouwde SAS-signature in de URL
 *  - Extra geheime header (x-digilab-secret) voor aanvullende validatie
 *  - Strikte invoervalidatie voordat er iets wordt doorgestuurd
 *  - CORS beperkt tot de productie-origin
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Omgevingsvariabelen (ingesteld via: supabase secrets set ...) ──────────
const POWER_AUTOMATE_WEBHOOK_URL = Deno.env.get('POWER_AUTOMATE_WEBHOOK_URL')
const DIGILAB_WEBHOOK_SECRET     = Deno.env.get('DIGILAB_WEBHOOK_SECRET')
const TOEGESTANE_ORIGIN          = Deno.env.get('TOEGESTANE_ORIGIN') ?? '*'

// ── Toegestane acties ──────────────────────────────────────────────────────
const TOEGESTANE_ACTIES = ['aanmaken', 'annuleren'] as const
type Actie = typeof TOEGESTANE_ACTIES[number]

// ── Payload die naar Power Automate wordt gestuurd ────────────────────────
interface AgendaPayload {
  actie:           Actie
  reservering_id:  string
  product_naam:    string
  product_code:    string
  medewerker_naam: string
  van_datum:       string   // YYYY-MM-DD
  tot_datum:       string   // YYYY-MM-DD
  toelichting?:    string
}

// ── CORS headers ───────────────────────────────────────────────────────────
function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin':  TOEGESTANE_ORIGIN === '*' ? origin : TOEGESTANE_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// ── Hoofdfunctie ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''

  // Preflight OPTIONS verzoek afhandelen
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) })
  }

  // Alleen POST toegestaan
  if (req.method !== 'POST') {
    return json({ fout: 'Methode niet toegestaan' }, 405, origin)
  }

  // ── 1. Controleer of de secrets zijn ingesteld ───────────────────────
  if (!POWER_AUTOMATE_WEBHOOK_URL || !DIGILAB_WEBHOOK_SECRET) {
    console.error('[agenda-sync] Omgevingsvariabelen ontbreken')
    return json({ fout: 'Server configuratiefout' }, 500, origin)
  }

  // ── 2. Verificeer Supabase JWT (ingelogde medewerker vereist) ────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ fout: 'Niet geautoriseerd' }, 401, origin)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return json({ fout: 'Ongeldige sessie' }, 401, origin)
  }

  // ── 3. Parseer en valideer de binnenkomende payload ──────────────────
  let body: AgendaPayload
  try {
    body = await req.json()
  } catch {
    return json({ fout: 'Ongeldige JSON' }, 400, origin)
  }

  const validatieFout = valideerPayload(body)
  if (validatieFout) {
    return json({ fout: validatieFout }, 400, origin)
  }

  // ── 4. Stuur door naar Power Automate met geheime header ─────────────
  let paResp: Response
  try {
    paResp = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-digilab-secret': DIGILAB_WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[agenda-sync] Power Automate aanroep mislukt:', err)
    return json({ fout: 'Agenda service niet bereikbaar' }, 502, origin)
  }

  if (!paResp.ok) {
    console.error('[agenda-sync] Power Automate fout:', paResp.status, await paResp.text())
    return json({ fout: 'Agenda update mislukt' }, 502, origin)
  }

  console.log(`[agenda-sync] OK — actie=${body.actie} id=${body.reservering_id} user=${user.email}`)
  return json({ ok: true, actie: body.actie }, 200, origin)
})

// ── Hulpfuncties ───────────────────────────────────────────────────────────

function json(data: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  })
}

function valideerPayload(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Payload ontbreekt'

  const p = body as Record<string, unknown>

  if (!TOEGESTANE_ACTIES.includes(p.actie as Actie))
    return `Ongeldige actie. Toegestaan: ${TOEGESTANE_ACTIES.join(', ')}`

  const verplicht: (keyof AgendaPayload)[] = [
    'reservering_id', 'product_naam', 'product_code',
    'medewerker_naam', 'van_datum', 'tot_datum',
  ]
  for (const veld of verplicht) {
    if (!p[veld] || typeof p[veld] !== 'string' || !(p[veld] as string).trim())
      return `Verplicht veld ontbreekt of leeg: ${veld}`
  }

  // Datumformaat validatie (YYYY-MM-DD)
  const datumRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!datumRegex.test(p.van_datum as string)) return 'Ongeldig formaat van_datum (verwacht YYYY-MM-DD)'
  if (!datumRegex.test(p.tot_datum as string)) return 'Ongeldig formaat tot_datum (verwacht YYYY-MM-DD)'
  if ((p.van_datum as string) > (p.tot_datum as string)) return 'van_datum mag niet na tot_datum liggen'

  return null
}
