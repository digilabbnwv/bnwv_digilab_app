/**
 * agendaSync.js — Koppeling met Power Automate via Supabase Edge Function
 *
 * De webhook URL van Power Automate staat UITSLUITEND in Supabase secrets
 * en is NOOIT zichtbaar in de frontend of in GitHub.
 *
 * Gebruik:
 *   import { syncAgendaAanmaken, syncAgendaAnnuleren } from './agendaSync'
 *
 *   // Bij nieuwe reservering:
 *   await syncAgendaAanmaken(reservering)
 *
 *   // Bij annulering:
 *   await syncAgendaAnnuleren(reservering)
 */

import { supabase } from './supabase'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

// ── Interne aanroep van de Edge Function ──────────────────────────────────

async function roepEdgeFunctionAan(payload) {
    // In mock-modus loggen we alleen naar de console
    if (MOCK) {
        console.info('[agendaSync] Mock-modus — geen echte aanroep:', payload)
        return
    }

    // Haal het huidige JWT-token op van de ingelogde medewerker
    const { data: { session }, error: sessieError } = await supabase.auth.getSession()
    if (sessieError || !session) {
        console.warn('[agendaSync] Geen actieve sessie — agenda niet gesynchroniseerd')
        return
    }

    const { error } = await supabase.functions.invoke('agenda-sync', {
        body: payload,
    })

    if (error) {
        // Loggen maar niet gooien: een agenda-sync fout mag de gebruiker
        // niet blokkeren bij het aanmaken of annuleren van een reservering.
        console.error('[agendaSync] Synchronisatie mislukt:', error.message)
    }
}

// ── Publieke functies ──────────────────────────────────────────────────────

/**
 * Stuur een nieuw agenda-item naar Outlook via Power Automate.
 *
 * @param {object} reservering - Volledig reserveringsobject (inclusief materiaal + medewerker)
 */
export async function syncAgendaAanmaken(reservering) {
    await roepEdgeFunctionAan({
        actie:           'aanmaken',
        reservering_id:  reservering.id,
        product_naam:    reservering.materiaal?.naam    ?? 'Onbekend product',
        product_code:    reservering.materiaal?.qr_code ?? 'ONBEKEND',
        medewerker_naam: reservering.medewerker?.naam   ?? 'Onbekende medewerker',
        van_datum:       reservering.van_datum,
        tot_datum:       reservering.tot_datum,
        toelichting:     reservering.toelichting ?? undefined,
    })
}

/**
 * Annuleer een agenda-item in Outlook via Power Automate.
 *
 * @param {object} reservering - Reserveringsobject dat geannuleerd wordt
 */
export async function syncAgendaAnnuleren(reservering) {
    await roepEdgeFunctionAan({
        actie:           'annuleren',
        reservering_id:  reservering.id,
        product_naam:    reservering.materiaal?.naam    ?? 'Onbekend product',
        product_code:    reservering.materiaal?.qr_code ?? 'ONBEKEND',
        medewerker_naam: reservering.medewerker?.naam   ?? 'Onbekende medewerker',
        van_datum:       reservering.van_datum,
        tot_datum:       reservering.tot_datum,
        toelichting:     reservering.toelichting ?? undefined,
    })
}
