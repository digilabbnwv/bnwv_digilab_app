/**
 * Reserveringen module — mock + Supabase ready
 *
 * Data model:
 *   reserveringen (id, materiaal_id, medewerker_id, van_datum, tot_datum,
 *                  toelichting, status: 'actief'|'geannuleerd'|'opgehaald', aangemaakt_op)
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
    mockMarkeerOpgehaald,
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

// ── Reserveringscontext voor meenemen-flow ──────────────────────

/**
 * Bepaalt de reserveringscontext bij het uitchecken van een item.
 * Puur/synchroon — werkt op een array reserveringen.
 *
 * @param {Array} reserveringen - Alle actieve reserveringen voor het item
 * @param {string} medewerkerId - ID van de huidige medewerker
 * @returns {{ eigenReservering, eerstvolgendeAnders, terugbrengDeadline, scenario }}
 */
export function computeReserveringsContext(reserveringen, medewerkerId) {
    // Lokale datum als YYYY-MM-DD (zonder UTC-conversie)
    const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const vandaag = localISO(new Date())

    // Bereken datum 7 dagen in de toekomst
    const d7 = new Date()
    d7.setDate(d7.getDate() + 7)
    const over7dagen = localISO(d7)

    // Alleen actieve reserveringen die nog niet verlopen zijn
    const actief = reserveringen.filter(r => r.status === 'actief' && r.tot_datum >= vandaag)

    // 1. Eigen reservering: loopt vandaag OF begint binnen 7 dagen
    const eigenReservering = actief.find(r => {
        const isMijn = (r.medewerker_id || r.medewerker?.id) === medewerkerId
        if (!isMijn) return false
        // Loopt vandaag (van_datum <= vandaag <= tot_datum)
        if (r.van_datum <= vandaag && r.tot_datum >= vandaag) return true
        // Begint binnen 7 dagen
        if (r.van_datum > vandaag && r.van_datum <= over7dagen) return true
        return false
    }) || null

    // 2. Eerstvolgende reservering van iemand anders
    const eerstvolgendeAnders = actief
        .filter(r => {
            const id = r.medewerker_id || r.medewerker?.id
            return id !== medewerkerId
        })
        .sort((a, b) => a.van_datum.localeCompare(b.van_datum))[0] || null

    // 3. Terugbrengdeadline: dag vóór de eerstvolgende reservering van ander
    let terugbrengDeadline = null
    if (eerstvolgendeAnders) {
        const [j, m, d] = eerstvolgendeAnders.van_datum.split('-').map(Number)
        const vanDatum = new Date(j, m - 1, d)
        vanDatum.setDate(vanDatum.getDate() - 1)
        terugbrengDeadline = localISO(vanDatum)
        if (terugbrengDeadline < vandaag) {
            terugbrengDeadline = vandaag
        }
    }

    // 4. Scenario bepalen
    let scenario
    if (eigenReservering) {
        scenario = 'eigen_reservering'
    } else if (eerstvolgendeAnders) {
        scenario = 'ad_hoc_conflict'
    } else {
        scenario = 'ad_hoc_vrij'
    }

    return { eigenReservering, eerstvolgendeAnders, terugbrengDeadline, scenario }
}

/**
 * Async wrapper: haalt reserveringen op en berekent context.
 * Gebruikt door Dashboard waar reserveringen niet pre-loaded zijn.
 */
export async function checkReserveringsContext(materiaalId, medewerkerId) {
    const reserveringen = await getReserveringenVoorItem(materiaalId)
    return computeReserveringsContext(reserveringen, medewerkerId)
}

/**
 * Update de status van een reservering naar 'opgehaald'.
 */
export async function markeerOpgehaald(reserveringId) {
    if (MOCK) return mockMarkeerOpgehaald(reserveringId)

    const { error } = await supabase
        .from('reserveringen')
        .update({ status: 'opgehaald' })
        .eq('id', reserveringId)
    if (error) throw error
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
