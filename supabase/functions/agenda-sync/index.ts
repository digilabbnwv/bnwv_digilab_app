/**
 * Supabase Edge Function: agenda-sync
 *
 * Ontvangt agenda-events vanuit de React-app en stuurt die veilig door
 * naar de juiste Power Automate webhook.
 *
 * Ondersteunde agenda-typen:
 *   ict_leskisten  — materiaalreserveringen → ictleskisten@bibliotheeknwveluwe.nl
 *   digilab_ermelo — geplande workshops Ermelo → Digilab Ermelo agenda
 *   digilab_nunspeet — geplande workshops Nunspeet → Digilab Nunspeet agenda
 *
 * Secrets (instellen via: supabase secrets set ...):
 *   WEBHOOK_URL_ICT       — bestaande ICT Leskisten flow
 *   WEBHOOK_URL_ERMELO    — nieuwe Power Automate flow Ermelo
 *   WEBHOOK_URL_NUNSPEET  — nieuwe Power Automate flow Nunspeet
 *   DIGILAB_WEBHOOK_SECRET
 *   TOEGESTANE_ORIGIN
 */

const WEBHOOK_URL_ICT      = Deno.env.get('WEBHOOK_URL_ICT') ?? Deno.env.get('POWER_AUTOMATE_WEBHOOK_URL')
const WEBHOOK_URL_ERMELO   = Deno.env.get('WEBHOOK_URL_ERMELO')
const WEBHOOK_URL_NUNSPEET = Deno.env.get('WEBHOOK_URL_NUNSPEET')
const DIGILAB_WEBHOOK_SECRET = Deno.env.get('DIGILAB_WEBHOOK_SECRET')
const TOEGESTANE_ORIGIN      = Deno.env.get('TOEGESTANE_ORIGIN') ?? '*'

const TOEGESTANE_ACTIES = ['aanmaken', 'annuleren', 'wijzigen'] as const
type Actie = typeof TOEGESTANE_ACTIES[number]

const AGENDA_TYPEN = ['ict_leskisten', 'digilab_ermelo', 'digilab_nunspeet'] as const
type AgendaType = typeof AGENDA_TYPEN[number]

// ── Payload voor materiaalreserveringen (ICT Leskisten) ────────
interface ReserveringPayload {
  agenda_type:      'ict_leskisten'
  actie:            Actie
  reservering_id:   string
  product_naam:     string
  product_code:     string
  medewerker_naam:  string
  medewerker_email: string
  van_datum:        string   // YYYY-MM-DD
  tot_datum:        string   // YYYY-MM-DD
  toelichting?:     string
}

// ── Payload voor geplande workshops (Ermelo / Nunspeet) ─────────
interface WorkshopPayload {
  agenda_type:            'digilab_ermelo' | 'digilab_nunspeet'
  actie:                  Actie
  workshop_id:            string
  titel:                  string
  datum:                  string   // YYYY-MM-DD
  start_tijd:             string   // HH:MM
  eind_tijd:              string   // HH:MM
  locatie:                string
  materiaal_omschrijving: string
  max_deelnemers?:        number
  opmerkingen?:           string
}

type InkomendPayload = ReserveringPayload | WorkshopPayload

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

function kiesWebhookUrl(agendaType: AgendaType): string | undefined {
  switch (agendaType) {
    case 'ict_leskisten':   return WEBHOOK_URL_ICT ?? undefined
    case 'digilab_ermelo':  return WEBHOOK_URL_ERMELO ?? undefined
    case 'digilab_nunspeet':return WEBHOOK_URL_NUNSPEET ?? undefined
  }
}

function valideerPayload(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Payload ontbreekt'
  const p = body as Record<string, unknown>

  // agenda_type — standaard ict_leskisten voor backwards-compat
  if (!p.agenda_type) p.agenda_type = 'ict_leskisten'
  if (!AGENDA_TYPEN.includes(p.agenda_type as AgendaType))
    return `Ongeldig agenda_type. Toegestaan: ${AGENDA_TYPEN.join(', ')}`

  if (!TOEGESTANE_ACTIES.includes(p.actie as Actie))
    return `Ongeldige actie. Toegestaan: ${TOEGESTANE_ACTIES.join(', ')}`

  if (p.agenda_type === 'ict_leskisten') {
    // Reservering-velden
    for (const veld of ['reservering_id', 'product_naam', 'product_code', 'medewerker_naam', 'van_datum', 'tot_datum'] as const) {
      if (!p[veld] || typeof p[veld] !== 'string' || !(p[veld] as string).trim())
        return `Verplicht veld ontbreekt of leeg: ${veld}`
    }
    const datumRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!datumRegex.test(p.van_datum as string)) return 'Ongeldig formaat van_datum (verwacht YYYY-MM-DD)'
    if (!datumRegex.test(p.tot_datum as string)) return 'Ongeldig formaat tot_datum (verwacht YYYY-MM-DD)'
    if ((p.van_datum as string) > (p.tot_datum as string)) return 'van_datum mag niet na tot_datum liggen'
  } else {
    // Workshop-velden
    for (const veld of ['workshop_id', 'titel', 'datum', 'start_tijd', 'eind_tijd', 'locatie'] as const) {
      if (!p[veld] || typeof p[veld] !== 'string' || !(p[veld] as string).trim())
        return `Verplicht veld ontbreekt of leeg: ${veld}`
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.datum as string)) return 'Ongeldig formaat datum (verwacht YYYY-MM-DD)'
    if (!/^\d{2}:\d{2}$/.test(p.start_tijd as string)) return 'Ongeldig formaat start_tijd (verwacht HH:MM)'
    if (!/^\d{2}:\d{2}$/.test(p.eind_tijd as string)) return 'Ongeldig formaat eind_tijd (verwacht HH:MM)'
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() })
  if (req.method !== 'POST') return json({ fout: 'Methode niet toegestaan' }, 405)

  if (!DIGILAB_WEBHOOK_SECRET) {
    console.error('[agenda-sync] DIGILAB_WEBHOOK_SECRET ontbreekt')
    return json({ fout: 'Server configuratiefout' }, 500)
  }

  let body: InkomendPayload
  try {
    body = await req.json()
  } catch {
    return json({ fout: 'Ongeldige JSON' }, 400)
  }

  const validatieFout = valideerPayload(body)
  if (validatieFout) return json({ fout: validatieFout }, 400)

  const agendaType = (body.agenda_type ?? 'ict_leskisten') as AgendaType
  const webhookUrl = kiesWebhookUrl(agendaType)

  if (!webhookUrl) {
    console.error(`[agenda-sync] Webhook URL voor ${agendaType} niet geconfigureerd`)
    return json({ fout: `Webhook voor ${agendaType} niet geconfigureerd` }, 500)
  }

  let paResp: Response
  try {
    paResp = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-digilab-secret': DIGILAB_WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[agenda-sync] Power Automate aanroep mislukt:', err)
    return json({ fout: 'Agenda service niet bereikbaar' }, 502)
  }

  if (!paResp.ok) {
    console.error(`[agenda-sync] Power Automate fout (${agendaType}):`, paResp.status, await paResp.text())
    return json({ fout: 'Agenda update mislukt' }, 502)
  }

  const logId = agendaType === 'ict_leskisten'
    ? (body as ReserveringPayload).reservering_id
    : (body as WorkshopPayload).workshop_id

  console.log(`[agenda-sync] OK — type=${agendaType} actie=${body.actie} id=${logId}`)
  return json({ ok: true, actie: body.actie, agenda_type: agendaType }, 200)
})
