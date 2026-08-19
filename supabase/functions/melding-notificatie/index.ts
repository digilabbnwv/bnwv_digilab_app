/**
 * Supabase Edge Function: melding-notificatie
 *
 * Verstuurt e-mailnotificaties rond onderhoudsmeldingen via Power Automate (M365):
 *   - actie 'nieuw'  → alle beheerders krijgen een melding + de aanmaker een
 *                      bevestiging (beide met een directe link naar de melding).
 *   - actie 'status' → de aanmaker krijgt bericht van de nieuwe status.
 *
 * Zelfde beveiligingspatroon als agenda-sync / metrics-rapportage:
 *   - geheimen uitsluitend via Supabase Secrets, nooit in de frontend
 *   - ontvangers worden hier server-side opgezocht (service-role), zodat
 *     e-mailadressen de client nooit bereiken
 *
 * Aangeroepen vanuit de app via supabase.functions.invoke('melding-notificatie').
 * Deploy zonder JWT-verificatie (de app gebruikt custom pincode-auth, geen
 * Supabase Auth JWT):  supabase functions deploy melding-notificatie --no-verify-jwt
 *
 * Secrets (instellen via: supabase secrets set ...):
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — queries die RLS negeren
 *   WEBHOOK_URL_MELDINGEN  — Power Automate flow die de e-mail(s) verstuurt
 *   DIGILAB_WEBHOOK_SECRET — meegestuurd als header naar Power Automate (bestaand secret)
 *   TOEGESTANE_ORIGIN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const WEBHOOK_URL_MELDINGEN  = Deno.env.get('WEBHOOK_URL_MELDINGEN')
const DIGILAB_WEBHOOK_SECRET = Deno.env.get('DIGILAB_WEBHOOK_SECRET')
const TOEGESTANE_ORIGIN      = Deno.env.get('TOEGESTANE_ORIGIN') ?? '*'

const TOEGESTANE_ACTIES = ['nieuw', 'status'] as const
type Actie = typeof TOEGESTANE_ACTIES[number]

const STATUSSEN = ['nieuw', 'in_behandeling', 'afgerond'] as const
type Status = typeof STATUSSEN[number]

const TYPE_LABEL: Record<string, string> = {
  kapot: 'Kapot',
  mist: 'Mist onderdeel',
  verbruiksmateriaal: 'Verbruiksmateriaal',
  anders: 'Anders',
}

const STATUS_LABEL: Record<Status, string> = {
  nieuw: 'Nieuw',
  in_behandeling: 'In behandeling',
  afgerond: 'Afgerond',
}

interface Payload {
  actie: Actie
  melding_id: string
  app_base_url: string
  nieuwe_status?: Status
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
  return tekst.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Bouwt de link naar de detailpagina uit de door de app aangeleverde basis-URL. */
function meldingLink(appBaseUrl: string, meldingId: string): string | null {
  try {
    const base = appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`
    const url = new URL(`melding/${meldingId}`, base)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function knopHtml(link: string): string {
  return `
    <p style="margin:20px 0;">
      <a href="${escapeHtml(link)}" style="background:#E8772E; color:#fff; padding:10px 18px;
        border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
        Melding bekijken
      </a>
    </p>
    <p style="font-size:12px; color:#666;">Of kopieer deze link: ${escapeHtml(link)}</p>`
}

function omhulsel(titel: string, binnen: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a; max-width:620px;">
      <h1 style="font-size:20px; color:#E8772E;">${escapeHtml(titel)}</h1>
      ${binnen}
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
      <p style="font-size:12px; color:#999;">Digilab BNWV — automatische notificatie, niet beantwoorden.</p>
    </div>`
}

function meldingDetailsHtml(m: MeldingRij): string {
  const rij = (k: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0; color:#666;">${escapeHtml(k)}</td>
      <td style="padding:4px 0; font-weight:bold;">${escapeHtml(v)}</td></tr>`
  return `
    <table style="font-size:14px; border-collapse:collapse; margin:12px 0;">
      ${rij('Materiaal', m.materiaal_naam)}
      ${rij('Type', TYPE_LABEL[m.type_melding] ?? m.type_melding)}
      ${rij('Status', STATUS_LABEL[m.status as Status] ?? m.status)}
      ${rij('Gemeld door', m.melder_naam)}
      ${m.toelichting ? rij('Toelichting', m.toelichting) : ''}
    </table>`
}

interface MeldingRij {
  id: string
  type_melding: string
  toelichting: string | null
  status: string
  materiaal_naam: string
  melder_naam: string
  melder_email: string | null
}

interface Bericht { email: string, onderwerp: string, html_body: string }

async function haalMelding(
  supabaseAdmin: ReturnType<typeof createClient>,
  meldingId: string,
): Promise<MeldingRij | null> {
  const { data, error } = await supabaseAdmin
    .from('onderhoudsmeldingen')
    .select('id, type_melding, toelichting, status, materiaal:materiaal(naam), gemeld_door_medewerker:medewerkers!onderhoudsmeldingen_gemeld_door_fkey(naam, email)')
    .eq('id', meldingId)
    .single()
  if (error || !data) return null
  return {
    id: data.id as string,
    type_melding: data.type_melding as string,
    toelichting: (data.toelichting as string | null) ?? null,
    status: data.status as string,
    materiaal_naam: (data.materiaal as { naam?: string } | null)?.naam ?? 'Onbekend materiaal',
    melder_naam: (data.gemeld_door_medewerker as { naam?: string } | null)?.naam ?? 'Onbekende medewerker',
    melder_email: (data.gemeld_door_medewerker as { email?: string } | null)?.email ?? null,
  }
}

async function haalBeheerderEmails(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('medewerkers')
    .select('email')
    .eq('rol', 'beheerder')
  return (data ?? []).map(m => m.email as string).filter(Boolean)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() })
  if (req.method !== 'POST') return json({ fout: 'Methode niet toegestaan' }, 405)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('[melding-notificatie] SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt')
    return json({ fout: 'Server configuratiefout' }, 500)
  }
  if (!WEBHOOK_URL_MELDINGEN || !DIGILAB_WEBHOOK_SECRET) {
    console.error('[melding-notificatie] WEBHOOK_URL_MELDINGEN of DIGILAB_WEBHOOK_SECRET ontbreekt')
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
  if (!body.melding_id || typeof body.melding_id !== 'string') {
    return json({ fout: 'melding_id ontbreekt' }, 400)
  }
  if (body.actie === 'status' && (!body.nieuwe_status || !STATUSSEN.includes(body.nieuwe_status))) {
    return json({ fout: `Ongeldige nieuwe_status. Toegestaan: ${STATUSSEN.join(', ')}` }, 400)
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  const melding = await haalMelding(supabaseAdmin, body.melding_id)
  if (!melding) return json({ fout: 'Melding niet gevonden' }, 404)

  const link = meldingLink(body.app_base_url ?? '', melding.id)
  const knop = link ? knopHtml(link) : ''

  const berichten: Bericht[] = []

  if (body.actie === 'nieuw') {
    // Bevestiging naar de aanmaker
    if (melding.melder_email) {
      berichten.push({
        email: melding.melder_email,
        onderwerp: `Bevestiging: onderhoudsmelding voor ${melding.materiaal_naam}`,
        html_body: omhulsel('Je onderhoudsmelding is ontvangen', `
          <p style="font-size:14px;">Bedankt, je melding is geregistreerd en zichtbaar voor de beheerders.</p>
          ${meldingDetailsHtml(melding)}
          ${knop}`),
      })
    }
    // Melding naar beheerders (exclusief de aanmaker; die kreeg al een bevestiging)
    const beheerders = (await haalBeheerderEmails(supabaseAdmin))
      .filter(e => e.toLowerCase() !== (melding.melder_email ?? '').toLowerCase())
    for (const email of beheerders) {
      berichten.push({
        email,
        onderwerp: `Nieuwe onderhoudsmelding: ${melding.materiaal_naam}`,
        html_body: omhulsel('Nieuwe onderhoudsmelding', `
          <p style="font-size:14px;">Er is een nieuwe onderhoudsmelding aangemaakt door ${escapeHtml(melding.melder_naam)}.</p>
          ${meldingDetailsHtml(melding)}
          ${knop}`),
      })
    }
  } else {
    // Statuswijziging → aanmaker
    if (melding.melder_email) {
      const statusLabel = STATUS_LABEL[body.nieuwe_status as Status]
      berichten.push({
        email: melding.melder_email,
        onderwerp: `Status bijgewerkt: ${melding.materiaal_naam} — ${statusLabel}`,
        html_body: omhulsel('Status van je melding is bijgewerkt', `
          <p style="font-size:14px;">De status van je onderhoudsmelding staat nu op
            <strong>${escapeHtml(statusLabel)}</strong>.</p>
          ${meldingDetailsHtml(melding)}
          ${knop}`),
      })
    }
  }

  if (berichten.length === 0) {
    console.warn(`[melding-notificatie] Geen ontvangers voor actie=${body.actie} melding=${melding.id}`)
    return json({ ok: true, verstuurd: false, reden: 'Geen ontvangers' }, 200)
  }

  const payload = {
    type: 'melding_notificatie',
    actie: body.actie,
    melding_id: melding.id,
    berichten,
    gegenereerd_op: new Date().toISOString(),
  }

  let paResp: Response
  try {
    paResp = await fetch(WEBHOOK_URL_MELDINGEN, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-digilab-secret': DIGILAB_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[melding-notificatie] Power Automate aanroep mislukt:', err)
    return json({ fout: 'Notificatie-service niet bereikbaar' }, 502)
  }

  if (!paResp.ok) {
    console.error('[melding-notificatie] Power Automate fout:', paResp.status, await paResp.text())
    return json({ fout: 'Notificatie verzenden mislukt' }, 502)
  }

  console.log(`[melding-notificatie] OK — actie=${body.actie} melding=${melding.id} berichten=${berichten.length}`)
  return json({ ok: true, verstuurd: true, berichten: berichten.length }, 200)
})
