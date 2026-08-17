/**
 * Rapportage-module — data-aggregatie voor de beheerdersrapportages.
 *
 * Twee lagen:
 *   1. Query-functies (MOCK-aware) die periode-brede datasets ophalen. De
 *      bestaande helpers in materiaal.js/reserveringen.js zijn te smal
 *      (per-item, gelimiteerd, alleen lopende reserveringen), dus hier staan
 *      bredere queries speciaal voor rapportage.
 *   2. Pure aggregatiefuncties (synchroon, zonder side effects) die exact de
 *      rekenlogica van supabase/functions/metrics-rapportage/index.ts spiegelen,
 *      zodat de cijfers in de app gelijk zijn aan die in de e-mailrapportage.
 *      Deze zijn los unit-getest in rapportage.test.js.
 */

import { supabase } from './supabase'
import {
    mockGetTransactiesInPeriode, mockGetLaatsteGebruikPerItem,
    mockGetReserveringenInPeriode, mockGetMedewerkers, mockGetLoginsInPeriode,
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

// Leesbare labels per categorie-prefix (zie mockDB seed / materiaal.categorie_prefix)
export const CATEGORIE_LABELS = {
    SPHE: 'Sphero',
    CVRT: 'ClassVR',
    OZOB: 'Ozobot',
    LEGO: 'LEGO',
    BEEB: 'Bee-Bot',
    PHOT: 'Photon',
    MBIT: 'Micro:Bit',
    DPRI: '3D-printer',
    LASR: 'Lasersnijder',
    LEES: 'Theaterlezen',
    OVER: 'Overig',
}

export function categorieLabel(prefix) {
    return CATEGORIE_LABELS[prefix] || prefix || 'Onbekend'
}

// ── Datum-hulpjes ───────────────────────────────────────────────

/** Einde-van-de-dag grens zodat .lte de hele dag `tot` meeneemt. */
function eindVanDag(datumISO) {
    return `${datumISO}T23:59:59.999Z`
}

// ── Query-functies ──────────────────────────────────────────────

/**
 * Alle transacties in [van, tot] (datums YYYY-MM-DD), verrijkt met materiaal.
 */
export async function getTransactiesInPeriode(van, tot) {
    if (MOCK) return mockGetTransactiesInPeriode(van, tot)

    const { data, error } = await supabase
        .from('transacties')
        .select('*, materiaal(id, naam, type, categorie_prefix, standaard_locatie)')
        .gte('tijdstip', van)
        .lte('tijdstip', eindVanDag(tot))
        .order('tijdstip', { ascending: false })
    if (error) throw error
    return data || []
}

/**
 * Laatste uitcheck-tijdstip per materiaal-id (over de volledige historie),
 * voor de "ongebruikt >90 dagen"-berekening. Retourneert een Map<id, tijdstip>.
 */
export async function getLaatsteGebruikPerItem() {
    if (MOCK) return mockGetLaatsteGebruikPerItem()

    const { data, error } = await supabase
        .from('transacties')
        .select('materiaal_id, tijdstip')
        .eq('type', 'uitchecken')
        .order('tijdstip', { ascending: false })
    if (error) throw error

    const map = new Map()
    for (const t of data || []) {
        if (!map.has(t.materiaal_id)) map.set(t.materiaal_id, t.tijdstip)
    }
    return map
}

/**
 * Alle reserveringen (alle statussen) aangemaakt in [van, tot], verrijkt met
 * materiaal + medewerker.
 */
export async function getReserveringenInPeriode(van, tot) {
    if (MOCK) return mockGetReserveringenInPeriode(van, tot)

    const { data, error } = await supabase
        .from('reserveringen')
        .select('*, materiaal(id, naam, type), medewerker:medewerkers(id, naam)')
        .gte('aangemaakt_op', van)
        .lte('aangemaakt_op', eindVanDag(tot))
        .order('aangemaakt_op', { ascending: false })
    if (error) throw error
    return data || []
}

/** Lichte lijst medewerkers (id, naam) voor naam-koppeling. */
export async function getMedewerkers() {
    if (MOCK) return mockGetMedewerkers()

    const { data, error } = await supabase.from('medewerkers').select('id, naam')
    if (error) throw error
    return data || []
}

/** Logins in [van, tot]. */
export async function getLoginsInPeriode(van, tot) {
    if (MOCK) return mockGetLoginsInPeriode(van, tot)

    const { data, error } = await supabase
        .from('logins')
        .select('medewerker_id, tijdstip')
        .gte('tijdstip', van)
        .lte('tijdstip', eindVanDag(tot))
    if (error) throw error
    return data || []
}

// ── Pure aggregatiefuncties (materiaal) ─────────────────────────

/**
 * Telt per materiaal het aantal check-outs. Telt UITSLUITEND type 'uitchecken'
 * (net als metrics-rapportage); inchecken/overrule/locatiewijziging tellen niet.
 * @returns {Array<{id, naam, aantal}>} aflopend gesorteerd.
 */
export function telGebruikPerItem(transacties) {
    const telling = new Map()
    const naam = new Map()
    for (const t of transacties) {
        if (t.type !== 'uitchecken') continue
        telling.set(t.materiaal_id, (telling.get(t.materiaal_id) || 0) + 1)
        if (t.materiaal?.naam) naam.set(t.materiaal_id, t.materiaal.naam)
    }
    return [...telling.entries()]
        .map(([id, aantal]) => ({ id, naam: naam.get(id) || id, aantal }))
        .sort((a, b) => b.aantal - a.aantal)
}

/**
 * Telt check-outs per categorie (op materiaal.categorie_prefix).
 * @returns {Array<{prefix, label, aantal}>}
 */
export function telGebruikPerCategorie(transacties) {
    const telling = new Map()
    for (const t of transacties) {
        if (t.type !== 'uitchecken') continue
        const prefix = t.materiaal?.categorie_prefix || 'OVER'
        telling.set(prefix, (telling.get(prefix) || 0) + 1)
    }
    return [...telling.entries()]
        .map(([prefix, aantal]) => ({ prefix, label: categorieLabel(prefix), aantal }))
        .sort((a, b) => b.aantal - a.aantal)
}

/**
 * Telt check-outs per (standaard)locatie. Uitcheck-transacties hebben zelf geen
 * locatie, dus de thuisbasis van het materiaal (standaard_locatie) wordt gebruikt.
 * @returns {Array<{locatie, aantal}>}
 */
export function telGebruikPerLocatie(transacties) {
    const telling = new Map()
    for (const t of transacties) {
        if (t.type !== 'uitchecken') continue
        const loc = t.materiaal?.standaard_locatie || 'Onbekend'
        telling.set(loc, (telling.get(loc) || 0) + 1)
    }
    return [...telling.entries()]
        .map(([locatie, aantal]) => ({ locatie, aantal }))
        .sort((a, b) => b.aantal - a.aantal)
}

/**
 * Materiaal zonder uitcheck in de laatste `dagen` dagen (incl. nooit gebruikt).
 * @param {Array} materiaalLijst - items met {id, naam}
 * @param {Map<string,string>} laatsteGebruik - id -> laatste uitcheck-tijdstip
 * @returns {Array<{id, naam, laatst: string|null}>}
 */
export function bepaalOngebruikt(materiaalLijst, laatsteGebruik, dagen = 90) {
    const grens = new Date(Date.now() - dagen * 24 * 60 * 60 * 1000).toISOString()
    return materiaalLijst
        .filter(m => {
            const laatst = laatsteGebruik.get(m.id)
            return !laatst || laatst < grens
        })
        .map(m => ({ id: m.id, naam: m.naam, laatst: laatsteGebruik.get(m.id) || null }))
}

// ── Pure aggregatiefuncties (reserveringen) ─────────────────────

/**
 * Telt reserveringen per status. 'opgehaald' telt opgehaalde én al teruggebrachte
 * samen (beide = daadwerkelijk opgehaald), gelijk aan metrics-rapportage.
 * @returns {{actief, opgehaald, geannuleerd}}
 */
export function telPerStatus(reserveringen) {
    const t = { actief: 0, opgehaald: 0, geannuleerd: 0 }
    for (const r of reserveringen) {
        if (r.status === 'opgehaald' || r.status === 'teruggebracht') t.opgehaald++
        else if (r.status === 'geannuleerd') t.geannuleerd++
        else if (r.status === 'actief') t.actief++
    }
    return t
}

/**
 * Telt reserveringen per medewerker.
 * @returns {Array<{id, naam, aantal}>} aflopend gesorteerd.
 */
export function telPerMedewerker(reserveringen) {
    const telling = new Map()
    const naam = new Map()
    for (const r of reserveringen) {
        const id = r.medewerker_id || r.medewerker?.id || 'onbekend'
        telling.set(id, (telling.get(id) || 0) + 1)
        if (r.medewerker?.naam) naam.set(id, r.medewerker.naam)
    }
    return [...telling.entries()]
        .map(([id, aantal]) => ({ id, naam: naam.get(id) || 'Onbekend', aantal }))
        .sort((a, b) => b.aantal - a.aantal)
}

/** Maandag (ISO) van de week waarin `datum` valt, als YYYY-MM-DD. */
function weekStart(datum) {
    const d = new Date(datum)
    const dag = (d.getDay() + 6) % 7 // ma=0 .. zo=6
    d.setDate(d.getDate() - dag)
    return d.toISOString().slice(0, 10)
}

/**
 * Buckets reserveringen op aanmaakdatum per week of maand.
 * @param {Array} reserveringen - met aangemaakt_op
 * @param {'week'|'maand'} eenheid
 * @returns {Array<{key, label, aantal}>} chronologisch gesorteerd.
 */
export function trendPerPeriode(items, eenheid = 'week', datumVeld = 'aangemaakt_op') {
    const telling = new Map()
    for (const r of items) {
        const datum = r[datumVeld]
        if (!datum) continue
        const key = eenheid === 'maand'
            ? datum.slice(0, 7)      // YYYY-MM
            : weekStart(datum)       // YYYY-MM-DD (maandag)
        telling.set(key, (telling.get(key) || 0) + 1)
    }
    return [...telling.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, aantal]) => ({ key, label: labelVoorBucket(key, eenheid), aantal }))
}

function labelVoorBucket(key, eenheid) {
    if (eenheid === 'maand') {
        const [j, m] = key.split('-')
        return new Date(Number(j), Number(m) - 1, 1)
            .toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' })
    }
    return new Date(key).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

/**
 * Gemiddelde tijd (uren, afgerond) tussen aanmaken van een reservering en het
 * daadwerkelijk uitchecken, gekoppeld via reservering_id. null als er geen
 * gekoppelde uitchecks zijn. Spiegel van metrics-rapportage.
 */
export function gemDoorlooptijd(reserveringen, transacties) {
    const uitcheckPerReservering = new Map()
    for (const t of transacties) {
        if (t.type === 'uitchecken' && t.reservering_id) {
            uitcheckPerReservering.set(t.reservering_id, t.tijdstip)
        }
    }
    const uren = reserveringen
        .map(r => {
            const uitcheck = uitcheckPerReservering.get(r.id)
            if (!uitcheck || !r.aangemaakt_op) return null
            return (new Date(uitcheck).getTime() - new Date(r.aangemaakt_op).getTime()) / 3_600_000
        })
        .filter(u => u !== null)
    if (uren.length === 0) return null
    return Math.round(uren.reduce((a, b) => a + b, 0) / uren.length)
}

// ── Pure aggregatiefuncties (onderhoud) ─────────────────────────

export const MELDING_LABELS = {
    kapot: 'Kapot',
    mist: 'Mist onderdeel',
    verbruiksmateriaal: 'Verbruiksmateriaal',
}

export function meldingLabel(type) {
    return MELDING_LABELS[type] || type || 'Onbekend'
}

/** Telt meldingen per type_melding. @returns {Array<{type, label, aantal}>} */
export function telMeldingenPerType(meldingen) {
    const telling = new Map()
    for (const m of meldingen) {
        telling.set(m.type_melding, (telling.get(m.type_melding) || 0) + 1)
    }
    return [...telling.entries()]
        .map(([type, aantal]) => ({ type, label: meldingLabel(type), aantal }))
        .sort((a, b) => b.aantal - a.aantal)
}

/** Telt meldingen per status. @returns {{open, opgelost}} */
export function telMeldingenPerStatus(meldingen) {
    const t = { open: 0, opgelost: 0 }
    for (const m of meldingen) {
        if (m.status === 'opgelost') t.opgelost++
        else t.open++
    }
    return t
}

/** Materiaal met de meeste meldingen. @returns {Array<{id, naam, aantal}>} */
export function telMeldingenPerMateriaal(meldingen) {
    const telling = new Map()
    const naam = new Map()
    for (const m of meldingen) {
        telling.set(m.materiaal_id, (telling.get(m.materiaal_id) || 0) + 1)
        if (m.materiaal?.naam) naam.set(m.materiaal_id, m.materiaal.naam)
    }
    return [...telling.entries()]
        .map(([id, aantal]) => ({ id, naam: naam.get(id) || id, aantal }))
        .sort((a, b) => b.aantal - a.aantal)
}

/** Gemiddelde oplostijd (uren, afgerond) van opgeloste meldingen. null als geen. */
export function gemOplostijd(meldingen) {
    const uren = meldingen
        .filter(m => m.status === 'opgelost' && m.tijdstip_gemeld && m.tijdstip_opgelost)
        .map(m => (new Date(m.tijdstip_opgelost).getTime() - new Date(m.tijdstip_gemeld).getTime()) / 3_600_000)
    if (uren.length === 0) return null
    return Math.round(uren.reduce((a, b) => a + b, 0) / uren.length)
}

// ── Pure aggregatiefuncties (workshops) ─────────────────────────

/** @returns {{concept, gepubliceerd, geannuleerd}} */
export function telWorkshopsPerStatus(workshops) {
    const t = { concept: 0, gepubliceerd: 0, geannuleerd: 0 }
    for (const w of workshops) if (w.status in t) t[w.status]++
    return t
}

/** @returns {Array<{sleutel, aantal}>} gegroepeerd op een tekstveld (locatie/doelgroep). */
export function telWorkshopsPer(workshops, veld) {
    const telling = new Map()
    for (const w of workshops) {
        const k = w[veld] || 'Onbekend'
        telling.set(k, (telling.get(k) || 0) + 1)
    }
    return [...telling.entries()]
        .map(([sleutel, aantal]) => ({ sleutel, aantal }))
        .sort((a, b) => b.aantal - a.aantal)
}

// ── Pure aggregatiefuncties (lesbrieven & leerlijn) ─────────────

/** @returns {{concept, gepubliceerd}} */
export function telLesplannenPerStatus(lesplannen) {
    const t = { concept: 0, gepubliceerd: 0 }
    for (const l of lesplannen) if (l.status in t) t[l.status]++
    return t
}

/** Telt lesplannen per thema (een lesplan kan meerdere thema's hebben). */
export function telLesplannenPerThema(lesplannen) {
    const telling = new Map()
    const kleur = new Map()
    for (const l of lesplannen) {
        for (const t of (l.themas || [])) {
            telling.set(t.naam, (telling.get(t.naam) || 0) + 1)
            if (t.kleur) kleur.set(t.naam, t.kleur)
        }
    }
    return [...telling.entries()]
        .map(([naam, aantal]) => ({ naam, kleur: kleur.get(naam) || null, aantal }))
        .sort((a, b) => b.aantal - a.aantal)
}

/** Telt lesplannen per doelgroep. */
export function telLesplannenPerDoelgroep(lesplannen) {
    const telling = new Map()
    const volgorde = new Map()
    for (const l of lesplannen) {
        for (const d of (l.doelgroepen || [])) {
            telling.set(d.naam, (telling.get(d.naam) || 0) + 1)
            volgorde.set(d.naam, d.volgorde ?? 999)
        }
    }
    return [...telling.entries()]
        .map(([naam, aantal]) => ({ naam, aantal }))
        .sort((a, b) => (volgorde.get(a.naam) - volgorde.get(b.naam)))
}

/**
 * Dekkingsgraad van de leerlijn: aandeel gevulde cellen in de matrix
 * (kerndoelen × gebruikte doelgroepen) o.b.v. getLeerlijnMatrix().
 * @returns {{gedekt, totaal, percentage}}
 */
export function berekenDekkingsgraad(matrix) {
    const rijen = matrix?.rijen?.length || 0
    const kolommen = matrix?.kolommen?.length || 0
    const totaal = rijen * kolommen
    const gedekt = Object.keys(matrix?.cellen || {}).length
    return { gedekt, totaal, percentage: totaal > 0 ? Math.round((gedekt / totaal) * 100) : 0 }
}

// ── Pure aggregatiefuncties (gebruikersactiviteit) ──────────────

/** Telt gebeurtenissen (logins/reserveringen/transacties) per medewerker-id. */
function telPerMedewerkerId(items, filter = () => true) {
    const telling = new Map()
    for (const it of items) {
        if (!filter(it)) continue
        const id = it.medewerker_id
        telling.set(id, (telling.get(id) || 0) + 1)
    }
    return telling
}

/**
 * Combineert logins, reserveringen en check-outs per medewerker tot activiteitsrijen.
 * @returns {Array<{id, naam, logins, reserveringen, checkouts, laatsteLogin}>}
 */
export function activiteitPerMedewerker(medewerkers, { logins = [], reserveringen = [], transacties = [] }) {
    const loginTelling = telPerMedewerkerId(logins)
    const resTelling = telPerMedewerkerId(reserveringen)
    const checkoutTelling = telPerMedewerkerId(transacties, t => t.type === 'uitchecken')

    const laatsteLogin = new Map()
    for (const l of logins) {
        const huidig = laatsteLogin.get(l.medewerker_id)
        if (!huidig || l.tijdstip > huidig) laatsteLogin.set(l.medewerker_id, l.tijdstip)
    }

    return medewerkers
        .map(m => ({
            id: m.id,
            naam: m.naam,
            logins: loginTelling.get(m.id) || 0,
            reserveringen: resTelling.get(m.id) || 0,
            checkouts: checkoutTelling.get(m.id) || 0,
            laatsteLogin: laatsteLogin.get(m.id) || null,
        }))
        .sort((a, b) => b.logins - a.logins || b.reserveringen - a.reserveringen)
}
