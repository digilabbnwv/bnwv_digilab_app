/**
 * Beschikbaarheidsmodule — centrale check voor materiaal.
 *
 * Combineert drie claimtypen:
 *   1. Reserveringen (datumbereik, actief)
 *   2. Geplande workshops (datum, niet-geannuleerd)
 *   3. Huidig gebruik (status = 'in_gebruik')
 *
 * Gebruikt door: ReserverenPagina, WorkshopInplannen, ItemPagina,
 * MateriaalOverzicht, Dashboard.
 */

import { getReserveringenVoorItem } from './reserveringen'
import { getGeplandeWorkshopsVoorMateriaal } from './geplandeWorkshops'
import { getMateriaalaItemById } from './materiaal'

// ── Helpers ─────────────────────────────────────────────────────

function localISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function vandaagStr() {
    return localISO(new Date())
}

/**
 * Check of twee datumbereiken overlappen (inclusief grenzen).
 * Alle parameters zijn ISO date strings (YYYY-MM-DD).
 */
export function datumOverlap(van1, tot1, van2, tot2) {
    return van1 <= tot2 && van2 <= tot1
}

// ── Conflicten ──────────────────────────────────────────────────

/**
 * Haal conflicten op voor een materiaalitem in een datumbereik.
 *
 * @param {string} materiaalId
 * @param {string} vanDatum  - ISO date YYYY-MM-DD (inclusief)
 * @param {string} totDatum  - ISO date YYYY-MM-DD (inclusief)
 * @param {string} [negeerReserveringId] - eigen reservering uitsluiten (bij bewerken)
 * @returns {Promise<{ beschikbaar: boolean, conflicten: Conflict[] }>}
 *
 * Conflict: { type, beschrijving, vanDatum, totDatum, medewerker?, workshopTitel? }
 */
export async function checkConflicten(materiaalId, vanDatum, totDatum, negeerReserveringId = null) {
    const [reserveringen, workshops, materiaal] = await Promise.all([
        getReserveringenVoorItem(materiaalId),
        getGeplandeWorkshopsVoorMateriaal(materiaalId),
        getMateriaalaItemById(materiaalId),
    ])

    const conflicten = []

    // 1. Reserveringsconflicten
    for (const r of reserveringen) {
        if (negeerReserveringId && r.id === negeerReserveringId) continue
        if (!datumOverlap(vanDatum, totDatum, r.van_datum, r.tot_datum)) continue

        const naam = r.medewerker?.naam || 'Onbekend'
        conflicten.push({
            type: 'reservering',
            beschrijving: `Gereserveerd door ${naam} (${formatDatumBereik(r.van_datum, r.tot_datum)})`,
            vanDatum: r.van_datum,
            totDatum: r.tot_datum,
            medewerker: naam,
            reserveringId: r.id,
        })
    }

    // 2. Workshopconflicten
    for (const w of workshops) {
        if (!datumOverlap(vanDatum, totDatum, w.datum, w.datum)) continue

        const titel = w.titel || 'Workshop'
        conflicten.push({
            type: 'workshop',
            beschrijving: `Workshop "${titel}" op ${formatDatum(w.datum)} (${w.start_tijd}–${w.eind_tijd || '?'}) — ${w.locatie || '?'}`,
            vanDatum: w.datum,
            totDatum: w.datum,
            workshopTitel: titel,
            workshopId: w.id,
        })
    }

    // 3. Huidig gebruik
    if (materiaal && materiaal.status === 'in_gebruik') {
        const naam = materiaal.huidige_medewerker?.naam || 'Onbekend'
        conflicten.push({
            type: 'uitgecheckt',
            beschrijving: `Nu in gebruik bij ${naam}`,
            vanDatum: vandaagStr(),
            totDatum: vandaagStr(),
            medewerker: naam,
        })
    }

    // Sorteer op datum
    conflicten.sort((a, b) => a.vanDatum.localeCompare(b.vanDatum))

    return {
        beschikbaar: conflicten.length === 0,
        conflicten,
    }
}

// ── Claim-map voor kalenderweergave ─────────────────────────────

/**
 * @typedef {Object} Claim
 * @property {'reservering'|'workshop'|'uitgecheckt'} type
 * @property {string} beschrijving
 * @property {string} [medewerker]
 * @property {string} [medewerkerId]
 * @property {string} [workshopTitel]
 */

/**
 * Bouw een dag-voor-dag claimmap voor een materiaalitem in een maand.
 *
 * @param {string} materiaalId
 * @param {number} jaar
 * @param {number} maand - 0-indexed (0=jan, 11=dec)
 * @param {string} [huidigeMedewerkerId] - voor eigen/anders kleuring
 * @returns {Promise<Record<string, Claim[]>>}
 */
export async function getClaimMapVoorMaand(materiaalId, jaar, maand, huidigeMedewerkerId = null) {
    const eersteDag = new Date(jaar, maand, 1)
    const laatsteDag = new Date(jaar, maand + 1, 0)
    const vanDatum = localISO(eersteDag)
    const totDatum = localISO(laatsteDag)

    const [reserveringen, workshops, materiaal] = await Promise.all([
        getReserveringenVoorItem(materiaalId),
        getGeplandeWorkshopsVoorMateriaal(materiaalId),
        getMateriaalaItemById(materiaalId),
    ])

    const claimMap = {}

    // Reserveringen uitspreiden over dagen
    for (const r of reserveringen) {
        if (!datumOverlap(vanDatum, totDatum, r.van_datum, r.tot_datum)) continue

        const start = r.van_datum > vanDatum ? r.van_datum : vanDatum
        const eind = r.tot_datum < totDatum ? r.tot_datum : totDatum
        const medId = r.medewerker_id || r.medewerker?.id
        const isEigen = huidigeMedewerkerId && medId === huidigeMedewerkerId

        let dag = new Date(start + 'T00:00:00')
        const eindDag = new Date(eind + 'T00:00:00')
        while (dag <= eindDag) {
            const key = localISO(dag)
            if (!claimMap[key]) claimMap[key] = []
            claimMap[key].push({
                type: isEigen ? 'eigen_reservering' : 'reservering',
                beschrijving: `${isEigen ? 'Jouw' : r.medewerker?.naam || 'Onbekend'} reservering`,
                medewerker: r.medewerker?.naam,
                medewerkerId: medId,
            })
            dag.setDate(dag.getDate() + 1)
        }
    }

    // Workshops als enkele dagen
    for (const w of workshops) {
        if (w.datum < vanDatum || w.datum > totDatum) continue
        if (!claimMap[w.datum]) claimMap[w.datum] = []
        claimMap[w.datum].push({
            type: 'workshop',
            beschrijving: `Workshop: ${w.titel || 'Onbekend'}`,
            workshopTitel: w.titel,
        })
    }

    // Huidig gebruik op vandaag
    if (materiaal && materiaal.status === 'in_gebruik') {
        const vandaag = vandaagStr()
        if (vandaag >= vanDatum && vandaag <= totDatum) {
            if (!claimMap[vandaag]) claimMap[vandaag] = []
            const naam = materiaal.huidige_medewerker?.naam || 'Onbekend'
            const isEigen = huidigeMedewerkerId && materiaal.huidige_medewerker_id === huidigeMedewerkerId
            claimMap[vandaag].push({
                type: 'uitgecheckt',
                beschrijving: isEigen ? 'Bij jou uitgecheckt' : `Uitgecheckt door ${naam}`,
                medewerker: naam,
            })
        }
    }

    return claimMap
}

// ── Datum formatting helpers ────────────────────────────────────

function formatDatum(iso) {
    const [j, m, d] = iso.split('-')
    return `${parseInt(d)}-${parseInt(m)}-${j}`
}

function formatDatumBereik(van, tot) {
    if (van === tot) return formatDatum(van)
    return `${formatDatum(van)} t/m ${formatDatum(tot)}`
}
