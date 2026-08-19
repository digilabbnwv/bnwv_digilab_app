/**
 * Supabase Edge Function: metrics-rapportage
 *
 * Wordt aangeroepen door een pg_cron-job (via pg_net) op twee schema's:
 *   - wekelijks   (?type=wekelijks)   — vooruitkijkend: geplande activiteiten,
 *                                       benodigd materiaal, planningsconflicten
 *   - maandelijks (?type=maandelijks) — terugkijkend: inlogfrequentie,
 *                                       reserveringen, materiaalgebruik
 *
 * Bouwt een HTML-rapportage en stuurt die door naar Power Automate (M365),
 * dat de daadwerkelijke e-mail verstuurt naar de actieve rapportage-ontvangers.
 * Zelfde beveiligingspatroon als agenda-sync: geen geheimen in de frontend,
 * secrets uitsluitend via Supabase Secrets.
 *
 * Secrets (instellen via: supabase secrets set ...):
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — voor queries die RLS negeren
 *   METRICS_REPORT_SECRET — inbound: alleen de eigen pg_cron-job mag deze
 *                           functie aanroepen (voorkomt dat een willekeurige
 *                           caller geaggregeerde login-/gebruiksdata opvraagt)
 *   WEBHOOK_URL_METRICS   — outbound: Power Automate flow die de e-mail verstuurt
 *   DIGILAB_WEBHOOK_SECRET — meegestuurd als header naar Power Automate (bestaand secret)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const METRICS_REPORT_SECRET = Deno.env.get('METRICS_REPORT_SECRET')
const WEBHOOK_URL_METRICS   = Deno.env.get('WEBHOOK_URL_METRICS')
const DIGILAB_WEBHOOK_SECRET = Deno.env.get('DIGILAB_WEBHOOK_SECRET')
const TOEGESTANE_ORIGIN     = Deno.env.get('TOEGESTANE_ORIGIN') ?? '*'

const PERIODEN = ['wekelijks', 'maandelijks'] as const
type Periode = typeof PERIODEN[number]

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  TOEGESTANE_ORIGIN === '*' ? '*' : TOEGESTANE_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-digilab-secret',
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function vandaag(): string {
  return new Date().toISOString().slice(0, 10)
}

function dagenGeleden(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function overlapt(vanA: string, totA: string, vanB: string, totB: string): boolean {
  return vanA <= totB && vanB <= totA
}

function escapeHtml(tekst: string): string {
  return tekst
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── HTML-opmaak (eenvoudige inline-styled tabellen, e-mailclient-vriendelijk) ──

function htmlPagina(titel: string, secties: string[]): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 700px;">
      <h1 style="font-size: 20px; color: #E8772E;">${escapeHtml(titel)}</h1>
      ${secties.join('\n')}
    </div>
  `
}

function htmlSectie(titel: string, rijen: string[][], kopregel: string[]): string {
  if (rijen.length === 0) {
    return `<h2 style="font-size: 16px;">${escapeHtml(titel)}</h2><p style="color:#666;">Geen gegevens voor deze periode.</p>`
  }
  const thead = kopregel.map(k => `<th style="text-align:left; padding:4px 8px; border-bottom:2px solid #ddd;">${escapeHtml(k)}</th>`).join('')
  const tbody = rijen.map(rij =>
    `<tr>${rij.map(cel => `<td style="padding:4px 8px; border-bottom:1px solid #eee;">${escapeHtml(String(cel))}</td>`).join('')}</tr>`
  ).join('')
  return `
    <h2 style="font-size: 16px;">${escapeHtml(titel)}</h2>
    <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `
}

// ── Wekelijks rapport ────────────────────────────────────────────────────────

async function bouwWekelijksRapport(supabaseAdmin: ReturnType<typeof createClient>) {
  const vanaf = vandaag()
  const tot = dagenGeleden(-14) // 14 dagen vooruit

  const { data: workshops } = await supabaseAdmin
    .from('geplande_workshops')
    .select('id, titel, datum, start_tijd, eind_tijd, locatie, status, materiaal_ids')
    .gte('datum', vanaf)
    .lte('datum', tot)
    .neq('status', 'geannuleerd')
    .order('datum')

  const alleMateriaalIds = [...new Set((workshops ?? []).flatMap(w => w.materiaal_ids ?? []))]

  const { data: materiaal } = alleMateriaalIds.length > 0
    ? await supabaseAdmin.from('materiaal').select('id, naam').in('id', alleMateriaalIds)
    : { data: [] }
  const materiaalNaam = new Map((materiaal ?? []).map(m => [m.id, m.naam]))

  const { data: reserveringen } = await supabaseAdmin
    .from('reserveringen')
    .select('materiaal_id, van_datum, tot_datum')
    .in('status', ['actief', 'opgehaald'])
    .gte('tot_datum', vanaf)

  const { data: openMeldingen } = alleMateriaalIds.length > 0
    ? await supabaseAdmin.from('onderhoudsmeldingen').select('materiaal_id, type_melding, toelichting, status').neq('status', 'afgerond').in('materiaal_id', alleMateriaalIds)
    : { data: [] }

  // Boekingen (reserveringen + workshops, workshops als eendaagse boeking) per materiaal, voor conflictdetectie
  const boekingen: { materiaal_id: string, van: string, tot: string, bron: string }[] = [
    ...(reserveringen ?? []).map(r => ({ materiaal_id: r.materiaal_id, van: r.van_datum, tot: r.tot_datum, bron: 'reservering' })),
    ...(workshops ?? []).flatMap(w => (w.materiaal_ids ?? []).map((mid: string) => ({ materiaal_id: mid, van: w.datum, tot: w.datum, bron: `workshop: ${w.titel}` }))),
  ]
  const conflicten: string[][] = []
  for (let i = 0; i < boekingen.length; i++) {
    for (let j = i + 1; j < boekingen.length; j++) {
      const a = boekingen[i], b = boekingen[j]
      if (a.materiaal_id === b.materiaal_id && overlapt(a.van, a.tot, b.van, b.tot)) {
        conflicten.push([materiaalNaam.get(a.materiaal_id) ?? a.materiaal_id, `${a.bron} (${a.van} t/m ${a.tot})`, `${b.bron} (${b.van} t/m ${b.tot})`])
      }
    }
  }

  const workshopRijen = (workshops ?? []).map(w => [
    w.datum, `${w.start_tijd}-${w.eind_tijd}`, w.titel, w.locatie,
    (w.materiaal_ids ?? []).map((mid: string) => materiaalNaam.get(mid) ?? mid).join(', ') || '—',
    w.status,
  ])

  const statusLabel: Record<string, string> = { nieuw: 'Nieuw', in_behandeling: 'In behandeling' }
  const meldingRijen = (openMeldingen ?? []).map(m => [materiaalNaam.get(m.materiaal_id) ?? m.materiaal_id, m.type_melding, statusLabel[m.status as string] ?? m.status, m.toelichting ?? '—'])

  const secties = [
    htmlSectie('Geplande activiteiten (komende 14 dagen)', workshopRijen, ['Datum', 'Tijd', 'Titel', 'Locatie', 'Materiaal', 'Status']),
    htmlSectie('Materiaalconflicten', conflicten, ['Materiaal', 'Boeking 1', 'Boeking 2']),
    htmlSectie('Openstaande onderhoudsmeldingen (relevant materiaal)', meldingRijen, ['Materiaal', 'Type', 'Status', 'Toelichting']),
  ]

  return {
    onderwerp: `Digilab weekoverzicht — ${vanaf} t/m ${tot}`,
    html: htmlPagina('Digilab weekoverzicht', secties),
  }
}

// ── Maandelijks rapport ──────────────────────────────────────────────────────

async function bouwMaandelijksRapport(supabaseAdmin: ReturnType<typeof createClient>) {
  const sinds = dagenGeleden(30)

  const { data: medewerkers } = await supabaseAdmin.from('medewerkers').select('id, naam')
  const { data: logins } = await supabaseAdmin.from('logins').select('medewerker_id, tijdstip').gte('tijdstip', sinds)
  const { data: reserveringen } = await supabaseAdmin
    .from('reserveringen')
    .select('medewerker_id, status, aangemaakt_op, id')
    .gte('aangemaakt_op', sinds)
  const { data: transacties } = await supabaseAdmin
    .from('transacties')
    .select('materiaal_id, type, tijdstip, reservering_id')
    .gte('tijdstip', sinds)
  const { data: materiaal } = await supabaseAdmin.from('materiaal').select('id, naam')
  const { data: laatsteGebruik } = await supabaseAdmin
    .from('transacties')
    .select('materiaal_id, tijdstip')
    .order('tijdstip', { ascending: false })

  const medewerkerNaam = new Map((medewerkers ?? []).map(m => [m.id, m.naam]))
  const materiaalNaam = new Map((materiaal ?? []).map(m => [m.id, m.naam]))

  // Logins per medewerker
  const loginTelling = new Map<string, number>()
  for (const l of logins ?? []) {
    loginTelling.set(l.medewerker_id, (loginTelling.get(l.medewerker_id) ?? 0) + 1)
  }
  const loginRijen = (medewerkers ?? [])
    .map(m => [m.naam, loginTelling.get(m.id) ?? 0])
    .sort((a, b) => (b[1] as number) - (a[1] as number))
  const nietIngelogd = (medewerkers ?? []).filter(m => !loginTelling.has(m.id)).map(m => m.naam)

  // Reserveringen per medewerker/status.
  // 'opgehaald' telt opgehaalde én al teruggebrachte reserveringen samen: beide
  // vertegenwoordigen een daadwerkelijk opgehaald item (teruggebracht = opgehaald + afgerond).
  const reserveringTelling = new Map<string, { actief: number, geannuleerd: number, opgehaald: number }>()
  for (const r of reserveringen ?? []) {
    const huidig = reserveringTelling.get(r.medewerker_id) ?? { actief: 0, geannuleerd: 0, opgehaald: 0 }
    if (r.status === 'opgehaald' || r.status === 'teruggebracht') huidig.opgehaald++
    else if (r.status === 'geannuleerd') huidig.geannuleerd++
    else if (r.status === 'actief') huidig.actief++
    reserveringTelling.set(r.medewerker_id, huidig)
  }
  const reserveringRijen = [...reserveringTelling.entries()].map(([medId, t]) =>
    [medewerkerNaam.get(medId) ?? medId, t.actief, t.opgehaald, t.geannuleerd]
  )

  // Gebruiksfrequentie per materiaal (transacties afgelopen 30 dagen)
  const gebruikTelling = new Map<string, number>()
  for (const t of transacties ?? []) {
    if (t.type !== 'uitchecken') continue
    gebruikTelling.set(t.materiaal_id, (gebruikTelling.get(t.materiaal_id) ?? 0) + 1)
  }
  const gebruikRijen = [...gebruikTelling.entries()]
    .map(([matId, aantal]) => [materiaalNaam.get(matId) ?? matId, aantal])
    .sort((a, b) => (b[1] as number) - (a[1] as number))

  // Materiaal zonder gebruik in >90 dagen
  const laatsteGebruikPerItem = new Map<string, string>()
  for (const t of laatsteGebruik ?? []) {
    if (!laatsteGebruikPerItem.has(t.materiaal_id)) laatsteGebruikPerItem.set(t.materiaal_id, t.tijdstip)
  }
  const grens90 = dagenGeleden(90)
  const ongebruiktRijen = (materiaal ?? [])
    .filter(m => {
      const laatst = laatsteGebruikPerItem.get(m.id)
      return !laatst || laatst < grens90
    })
    .map(m => [m.naam, laatsteGebruikPerItem.get(m.id)?.slice(0, 10) ?? 'nooit'])

  // Gemiddelde tijd tussen reservering aanmaken en ophalen (uitchecken)
  const uitcheckPerReservering = new Map<string, string>()
  for (const t of transacties ?? []) {
    if (t.type === 'uitchecken' && t.reservering_id) uitcheckPerReservering.set(t.reservering_id, t.tijdstip)
  }
  const wachttijden = (reserveringen ?? [])
    .map(r => {
      const uitcheckTijdstip = uitcheckPerReservering.get(r.id)
      if (!uitcheckTijdstip) return null
      return (new Date(uitcheckTijdstip).getTime() - new Date(r.aangemaakt_op).getTime()) / (1000 * 60 * 60)
    })
    .filter((u): u is number => u !== null)
  const gemiddeldeWachttijd = wachttijden.length > 0
    ? Math.round(wachttijden.reduce((a, b) => a + b, 0) / wachttijden.length)
    : null

  const secties = [
    htmlSectie('Inlogfrequentie per medewerker (afgelopen 30 dagen)', loginRijen, ['Medewerker', 'Aantal logins']),
    htmlSectie('Niet ingelogd afgelopen 30 dagen', nietIngelogd.map(n => [n]), ['Medewerker']),
    htmlSectie('Reserveringen per medewerker (afgelopen 30 dagen)', reserveringRijen, ['Medewerker', 'Actief', 'Opgehaald', 'Geannuleerd']),
    htmlSectie('Meest gebruikt materiaal (afgelopen 30 dagen)', gebruikRijen, ['Materiaal', 'Keer uitgecheckt']),
    htmlSectie('Materiaal ongebruikt (>90 dagen)', ongebruiktRijen, ['Materiaal', 'Laatst gebruikt']),
  ]

  if (gemiddeldeWachttijd !== null) {
    secties.push(`<p style="font-size:14px;">Gemiddelde tijd tussen reserveren en ophalen: <strong>${gemiddeldeWachttijd} uur</strong>.</p>`)
  }

  return {
    onderwerp: `Digilab maandoverzicht — afgelopen 30 dagen`,
    html: htmlPagina('Digilab maandoverzicht', secties),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() })

  if (!METRICS_REPORT_SECRET || req.headers.get('x-digilab-secret') !== METRICS_REPORT_SECRET) {
    return json({ fout: 'Niet geautoriseerd' }, 401)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('[metrics-rapportage] SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt')
    return json({ fout: 'Server configuratiefout' }, 500)
  }
  if (!WEBHOOK_URL_METRICS || !DIGILAB_WEBHOOK_SECRET) {
    console.error('[metrics-rapportage] WEBHOOK_URL_METRICS of DIGILAB_WEBHOOK_SECRET ontbreekt')
    return json({ fout: 'Server configuratiefout' }, 500)
  }

  const url = new URL(req.url)
  const periode = url.searchParams.get('type') as Periode | null
  if (!periode || !PERIODEN.includes(periode)) {
    return json({ fout: `Ongeldig of ontbrekend type. Toegestaan: ${PERIODEN.join(', ')}` }, 400)
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  const { data: ontvangers, error: ontvangersError } = await supabaseAdmin
    .from('rapportage_ontvangers')
    .select('email')
    .eq('actief', true)

  if (ontvangersError) {
    console.error('[metrics-rapportage] Kon ontvangers niet ophalen:', ontvangersError)
    return json({ fout: 'Kon ontvangers niet ophalen' }, 500)
  }
  if (!ontvangers || ontvangers.length === 0) {
    console.warn('[metrics-rapportage] Geen actieve ontvangers geconfigureerd, rapport wordt niet verstuurd')
    return json({ ok: true, verstuurd: false, reden: 'Geen actieve ontvangers' }, 200)
  }

  const { onderwerp, html } = periode === 'wekelijks'
    ? await bouwWekelijksRapport(supabaseAdmin)
    : await bouwMaandelijksRapport(supabaseAdmin)

  const payload = {
    type: 'metrics_rapportage',
    periode,
    ontvangers: ontvangers.map(o => o.email),
    onderwerp,
    html_body: html,
    gegenereerd_op: new Date().toISOString(),
  }

  let paResp: Response
  try {
    paResp = await fetch(WEBHOOK_URL_METRICS, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-digilab-secret': DIGILAB_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[metrics-rapportage] Power Automate aanroep mislukt:', err)
    return json({ fout: 'Rapportage-service niet bereikbaar' }, 502)
  }

  if (!paResp.ok) {
    console.error('[metrics-rapportage] Power Automate fout:', paResp.status, await paResp.text())
    return json({ fout: 'Rapportage verzenden mislukt' }, 502)
  }

  console.log(`[metrics-rapportage] OK — periode=${periode} ontvangers=${ontvangers.length}`)
  return json({ ok: true, verstuurd: true, periode, ontvangers: ontvangers.length }, 200)
})
