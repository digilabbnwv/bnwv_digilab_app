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
 *
 *   // Bij publiceren/annuleren van een geplande workshop:
 *   await syncWorkshopAgenda(geplandeWorkshop, 'aanmaken' | 'annuleren' | 'wijzigen')
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
        medewerker_email: reservering.medewerker?.email  ?? '',
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
        medewerker_email: reservering.medewerker?.email  ?? '',
        van_datum:       reservering.van_datum,
        tot_datum:       reservering.tot_datum,
        toelichting:     reservering.toelichting ?? undefined,
    })
}

/**
 * Wijzig een bestaand agenda-item in Outlook via Power Automate.
 * Let op: vereist de toevoeging in backend en app van 'wijzigen' als type.
 *
 * @param {object} reservering - Reserveringsobject met de nieuwe aanpassingen
 */
export async function syncAgendaWijzigen(reservering) {
    await roepEdgeFunctionAan({
        actie:           'wijzigen',
        reservering_id:  reservering.id,
        product_naam:    reservering.materiaal?.naam    ?? 'Onbekend product',
        product_code:    reservering.materiaal?.qr_code ?? 'ONBEKEND',
        medewerker_naam: reservering.medewerker?.naam   ?? 'Onbekende medewerker',
        medewerker_email: reservering.medewerker?.email  ?? '',
        van_datum:       reservering.van_datum,
        tot_datum:       reservering.tot_datum,
        toelichting:     reservering.toelichting ?? undefined,
    })
}

/**
 * Sync een geplande workshop naar de juiste Digilab-agenda in Outlook.
 *
 * Alleen Ermelo en Nunspeet krijgen een agenda-event. Andere locaties worden
 * overgeslagen (geen Outlook-sync voor incidentele locaties).
 *
 * @param {object} workshop - Volledig geplandeWorkshop-object
 * @param {'aanmaken'|'annuleren'|'wijzigen'} actie
 */
export async function syncWorkshopAgenda(workshop, actie) {
    const locatie = workshop.locatie?.toLowerCase()
    if (locatie !== 'ermelo' && locatie !== 'nunspeet') {
        console.info(`[agendaSync] Geen Outlook-sync voor locatie: ${workshop.locatie}`)
        return
    }

    const agendaType = locatie === 'ermelo' ? 'digilab_ermelo' : 'digilab_nunspeet'

    await roepEdgeFunctionAan({
        agenda_type:            agendaType,
        actie,
        workshop_id:            workshop.id,
        titel:                  workshop.titel,
        datum:                  workshop.datum,
        start_tijd:             workshop.start_tijd?.slice(0, 5) ?? '15:30',
        eind_tijd:              workshop.eind_tijd?.slice(0, 5)  ?? '16:30',
        locatie:                workshop.locatie,
        materiaal_omschrijving: workshop.materiaal_omschrijving  ?? '',
        max_deelnemers:         workshop.max_deelnemers          ?? undefined,
        opmerkingen:            workshop.opmerkingen             ?? undefined,
    })
}
