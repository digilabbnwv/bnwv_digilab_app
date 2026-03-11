/**
 * Reserveringen module — mock + Supabase ready
 *
 * Data model:
 *   reserveringen (id, materiaal_id, medewerker_id, van_datum, tot_datum,
 *                  toelichting, status: 'actief'|'geannuleerd', aangemaakt_op)
 *
 * Toekomstige kalender-integratie:
 *   De van_datum/tot_datum velden zijn ISO 8601 datums (YYYY-MM-DD).
 *   Ze zijn direct bruikbaar als DTSTART/DTEND in iCalendar-formaat (.ics).
 *   Om reserveringen te synchroniseren met de mailboxagenda van
 *   ictleskisten@bibliotheeknwveluwe.nl kan in de toekomst:
 *   - Een Edge Function / webhook worden ingezet die reserveringen omzet naar
 *     iCalendar events via de Microsoft Graph API (Exchange Online / Outlook).
 *   - Of een dagelijkse .ics-export die handmatig/automatisch geïmporteerd wordt.
 *   De functie `exporteerICS()` hieronder is een stub voor dat gebruik.
 */

import { supabase } from './supabase'
import { syncAgendaAanmaken, syncAgendaAnnuleren } from './agendaSync'
import {
    mockGetAlleReserveringen, mockGetReserveringenVoorItem,
    mockGetMijnReserveringen, mockMaakReservering, mockAnnuleerReservering,
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

// ── Ophalen ─────────────────────────────────────────────────────

export async function getAlleReserveringen() {
    if (MOCK) return mockGetAlleReserveringen()

    const { data, error } = await supabase
        .from('reserveringen')
        .select('*, materiaal(id, naam, type, qr_code), medewerker:medewerkers(id, naam)')
        .eq('status', 'actief')
        .gte('tot_datum', new Date().toISOString().slice(0, 10))
        .order('van_datum')
    if (error) throw error
    return data
}

export async function getReserveringenVoorItem(materiaalId) {
    if (MOCK) return mockGetReserveringenVoorItem(materiaalId)

    const vandaag = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
        .from('reserveringen')
        .select('*, medewerker:medewerkers(id, naam)')
        .eq('materiaal_id', materiaalId)
        .eq('status', 'actief')
        .gte('tot_datum', vandaag)
        .order('van_datum')
    if (error) throw error
    return data
}

export async function getMijnReserveringen(medewerkerId) {
    if (MOCK) return mockGetMijnReserveringen(medewerkerId)

    const vandaag = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
        .from('reserveringen')
        .select('*, materiaal(id, naam, type, qr_code)')
        .eq('medewerker_id', medewerkerId)
        .eq('status', 'actief')
        .gte('tot_datum', vandaag)
        .order('van_datum')
    if (error) throw error
    return data
}

// ── Aanmaken ────────────────────────────────────────────────────

export async function maakReservering({ materiaalId, medewerkerId, vanDatum, totDatum, toelichting }) {
    if (MOCK) return mockMaakReservering({ materiaalId, medewerkerId, vanDatum, totDatum, toelichting })

    const { data, error } = await supabase
        .from('reserveringen')
        .insert([{
            materiaal_id: materiaalId,
            medewerker_id: medewerkerId,
            van_datum: vanDatum,
            tot_datum: totDatum,
            toelichting: toelichting || null,
            status: 'actief',
            aangemaakt_op: new Date().toISOString(),
        }])
        .select('*, materiaal(id, naam, type, qr_code), medewerker:medewerkers(id, naam)')
        .single()
    if (error) throw error

    // Sync met agenda op de achtergrond (niet wachten op resultaat)
    syncAgendaAanmaken(data).catch(err => console.error('[maakReservering] Agenda sync fout:', err))

    return data
}

// ── Annuleren ───────────────────────────────────────────────────

export async function annuleerReservering(reserveringId, medewerkerId) {
    if (MOCK) return mockAnnuleerReservering(reserveringId, medewerkerId)

    const { data, error } = await supabase
        .from('reserveringen')
        .update({ status: 'geannuleerd' })
        .eq('id', reserveringId)
        .select('*, materiaal(id, naam, type, qr_code), medewerker:medewerkers(id, naam)')
        .single()
    if (error) throw error

    // Sync annulering met agenda op de achtergrond
    if (data) {
        syncAgendaAnnuleren(data).catch(err => console.error('[annuleerReservering] Agenda sync fout:', err))
    }
}

// ── Hulpfuncties ────────────────────────────────────────────────

/**
 * Controleert of een reservering overlaptmet de huidige datum.
 */
export function isActiefVandaag(reservering) {
    const vandaag = new Date().toISOString().slice(0, 10)
    return reservering.van_datum <= vandaag && reservering.tot_datum >= vandaag
}

/**
 * Geeft de eerste actieve/aankomende reservering voor een item terug.
 * Gebruikt om de waarschuwing op de itemkaart te bepalen.
 */
export function getEersteActieveReservering(reserveringen) {
    const vandaag = new Date().toISOString().slice(0, 10)
    return reserveringen
        .filter(r => r.tot_datum >= vandaag && r.status === 'actief')
        .sort((a, b) => a.van_datum.localeCompare(b.van_datum))[0] || null
}

/**
 * ICS-export stub voor toekomstige agenda-integratie.
 *
 * In de toekomst kan dit naar de Microsoft Graph API worden gestuurd om
 * events aan te maken in de agenda van ictleskisten@bibliotheeknwveluwe.nl.
 *
 * @param {Array} reserveringen - Lijst van reserveringen (met materiaal + medewerker)
 * @returns {string} iCalendar-formaat tekst (.ics)
 */
export function exporteerICS(reserveringen) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BNWV Digilab//Reserveringen//NL',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ]

    for (const r of reserveringen) {
        const uid = `${r.id}@digilab.bibliotheeknwveluwe.nl`
        const dtstart = r.van_datum.replace(/-/g, '')
        const dtend = r.tot_datum.replace(/-/g, '')
        const summary = `${r.materiaal?.naam || 'Item'} — ${r.medewerker?.naam || ''}`
        const desc = r.toelichting ? r.toelichting.replace(/\n/g, '\\n') : ''
        lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTART;VALUE=DATE:${dtstart}`,
            `DTEND;VALUE=DATE:${dtend}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${desc}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
        )
    }

    lines.push('END:VCALENDAR')
    return lines.join('\r\n')
}
