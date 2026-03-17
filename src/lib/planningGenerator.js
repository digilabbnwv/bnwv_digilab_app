/**
 * Slimme planningsgenerator voor Digilab workshops.
 * Implementeert de regels uit de Excel-tab "Regels".
 *
 * Input:  startDatum (YYYY-MM-DD), eindDatum (YYYY-MM-DD), workshopTemplates[]
 * Output: concept geplande_workshops[]
 */

// ── Nederlandse feestdagen (hardcoded 2026–2027) ────────────────
const FEESTDAGEN = new Set([
    // 2026
    '2026-01-01', // Nieuwjaarsdag
    '2026-04-03', // Goede Vrijdag
    '2026-04-05', // Eerste Paasdag
    '2026-04-06', // Tweede Paasdag
    '2026-04-27', // Koningsdag
    '2026-05-05', // Bevrijdingsdag
    '2026-05-14', // Hemelvaartsdag
    '2026-05-24', // Eerste Pinksterdag
    '2026-05-25', // Tweede Pinksterdag
    '2026-12-25', // Eerste Kerstdag
    '2026-12-26', // Tweede Kerstdag
    // 2027
    '2027-01-01', // Nieuwjaarsdag
    '2027-03-26', // Goede Vrijdag
    '2027-03-28', // Eerste Paasdag
    '2027-03-29', // Tweede Paasdag
    '2027-04-27', // Koningsdag
    '2027-05-05', // Bevrijdingsdag
    '2027-05-06', // Hemelvaartsdag
    '2027-05-16', // Eerste Pinksterdag
    '2027-05-17', // Tweede Pinksterdag
    '2027-12-25', // Eerste Kerstdag
    '2027-12-26', // Tweede Kerstdag
])

// ── Schoolvakanties regio Midden Nederland ──────────────────────
// type: 'geen' = geen programmering, 'open_digilab' = Open Digilab, 'week_voor' = geen workshops
const SCHOOLVAKANTIES = [
    // 2026
    { naam: 'Voorjaarsvakantie 2026',  van: '2026-02-16', tot: '2026-02-20', type: 'open_digilab' },
    { naam: 'Meivakantie 2026',        van: '2026-04-27', tot: '2026-05-08', type: 'open_digilab' },
    { naam: 'Zomervakantie 2026',      van: '2026-07-18', tot: '2026-08-28', type: 'geen' },
    { naam: 'Herfstvakantie 2026',     van: '2026-10-19', tot: '2026-10-23', type: 'open_digilab' },
    { naam: 'Kerstvakantie 2026-2027', van: '2026-12-21', tot: '2027-01-01', type: 'geen' },
    // 2027
    { naam: 'Voorjaarsvakantie 2027',  van: '2027-02-15', tot: '2027-02-19', type: 'open_digilab' },
    { naam: 'Meivakantie 2027',        van: '2027-04-26', tot: '2027-05-07', type: 'open_digilab' },
    { naam: 'Zomervakantie 2027',      van: '2027-07-17', tot: '2027-08-27', type: 'geen' },
    { naam: 'Herfstvakantie 2027',     van: '2027-10-18', tot: '2027-10-22', type: 'open_digilab' },
    { naam: 'Kerstvakantie 2027-2028', van: '2027-12-20', tot: '2028-01-07', type: 'geen' },
]

// Speciale periodes voor opmerkingen
const SPECIALE_PERIODES = [
    { naam: 'Nationale Kinderboekenweek', van: '2026-10-07', tot: '2026-10-18' },
    { naam: 'Nationale Kinderboekenweek', van: '2027-10-06', tot: '2027-10-17' },
    { naam: 'Nationale Voorleesdagen',    van: '2026-01-26', tot: '2026-02-06' },
    { naam: 'Nationale Voorleesdagen',    van: '2027-01-25', tot: '2027-02-05' },
]

// ── Datumhulpfuncties ───────────────────────────────────────────

function datumStr(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function parseDatum(str) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
}

function addDagen(date, n) {
    const d = new Date(date)
   d.setDate(d.getDate() + n)
    return d
}

function getWeekNummer(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function getJaarWeek(dag) {
    const d = parseDatum(dag)
    return `${d.getFullYear()}-W${String(getWeekNummer(d)).padStart(2, '0')}`
}

// Geeft vakantie-type terug als datum in een vakantie valt, anders null
function getVakantieType(dag) {
    for (const v of SCHOOLVAKANTIES) {
        if (dag >= v.van && dag <= v.tot) return v.type
    }
    return null
}

// Geeft true terug als de datum in de week VOOR kerst/zomer valt
function isWeekVoorHoofdvakantie(dag) {
    const hoofdvakanties = SCHOOLVAKANTIES.filter(v => v.type === 'geen')
    for (const v of hoofdvakanties) {
        const startVakantie = parseDatum(v.van)
        const weekVoor = datumStr(addDagen(startVakantie, -7))
        const dagVoor = datumStr(addDagen(startVakantie, -1))
        if (dag >= weekVoor && dag <= dagVoor) return true
    }
    return false
}

function getSpecialePeriode(dag) {
    for (const p of SPECIALE_PERIODES) {
        if (dag >= p.van && dag <= p.tot) return p.naam
    }
    return null
}

// Laatste vrijdag van de maand
function isLaatstevrijdagVanMaand(date) {
    if (date.getDay() !== 5) return false // niet vrijdag
    const volgendeVrijdag = new Date(date)
    volgendeVrijdag.setDate(date.getDate() + 7)
    return volgendeVrijdag.getMonth() !== date.getMonth()
}

// ── Slot-generatie ──────────────────────────────────────────────

function genereerSlots(startDatum, eindDatum) {
    const slots = []
    let huidigeDatum = parseDatum(startDatum)
    const eind = parseDatum(eindDatum)

    while (huidigeDatum <= eind) {
        const dag = datumStr(huidigeDatum)
        const weekdag = huidigeDatum.getDay() // 0=zo, 1=ma, ..., 3=wo, 4=do, 5=vr

        if (weekdag === 3) { // Woensdag → Nunspeet
            slots.push({ datum: dag, locatie: 'Nunspeet', start_tijd: '15:30', eind_tijd: '16:30' })
        } else if (weekdag === 4) { // Donderdag → Ermelo
            slots.push({ datum: dag, locatie: 'Ermelo', start_tijd: '15:30', eind_tijd: '16:30' })
        } else if (weekdag === 5 && isLaatstevrijdagVanMaand(huidigeDatum)) { // Laatste vrijdag
            slots.push({ datum: dag, locatie: 'Ermelo', start_tijd: '13:00', eind_tijd: '14:30', forceerTemplate: 'AI VibeLab' })
        }

        huidigeDatum = addDagen(huidigeDatum, 1)
    }

    return slots
}

// ── Template-toewijzing ─────────────────────────────────────────

/**
 * Kiest de volgende template voor een slot, met gelijke verdeling en materiaalconflict-check.
 *
 * @param {string} locatie - 'Ermelo' | 'Nunspeet'
 * @param {string} week - jaar-week string voor conflictcheck
 * @param {Array} beschikbareTemplates - alle gewone templates (excl. VibeLab en Open Digilab)
 * @param {Object} tellers - { templateId: { Ermelo: n, Nunspeet: n } }
 * @param {Object} weekMateriaal - { week: { Ermelo: materiaalStr, Nunspeet: materiaalStr } }
 */
function kiesTemplate(locatie, week, beschikbareTemplates, tellers, weekMateriaal) {
    const andereLocatie = locatie === 'Ermelo' ? 'Nunspeet' : 'Ermelo'
    const gebruiktMateriaalAndereLocatie = weekMateriaal[week]?.[andereLocatie] || null

    // Sorteer op minst gebruikt op deze locatie, daarna totaal
    const gesorteerd = [...beschikbareTemplates].sort((a, b) => {
        const aantalA = (tellers[a.id]?.[locatie] || 0)
        const aantalB = (tellers[b.id]?.[locatie] || 0)
        if (aantalA !== aantalB) return aantalA - aantalB
        const totaalA = (tellers[a.id]?.Ermelo || 0) + (tellers[a.id]?.Nunspeet || 0)
        const totaalB = (tellers[b.id]?.Ermelo || 0) + (tellers[b.id]?.Nunspeet || 0)
        return totaalA - totaalB
    })

    // Kies eerste die geen materiaalconflict heeft
    for (const tmpl of gesorteerd) {
        if (!tmpl.materiaal_omschrijving) return tmpl // geen materiaal = geen conflict
        if (!gebruiktMateriaalAndereLocatie) return tmpl // andere locatie heeft niks die week
        if (tmpl.materiaal_omschrijving !== gebruiktMateriaalAndereLocatie) return tmpl
    }

    // Fallback: eerste template (liever conflict dan niets)
    return gesorteerd[0] || null
}

// ── Hoofdfunctie ────────────────────────────────────────────────

/**
 * Genereert een concept-planning voor de opgegeven periode.
 *
 * @param {string} startDatum - YYYY-MM-DD
 * @param {string} eindDatum  - YYYY-MM-DD
 * @param {Array}  templates  - alle workshop_templates uit de catalogus
 * @param {string} aangemaaaktDoorId - medewerker UUID
 * @returns {Array} concept geplande_workshops (nog niet opgeslagen)
 */
export function genereerPlanning(startDatum, eindDatum, templates, aangemaaaktDoorId) {
    const batchId = crypto.randomUUID()

    // Haal speciale templates op
    const vibeLabTemplate = templates.find(t => t.titel.toLowerCase().includes('vibelab'))
    const openDigilabTemplate = templates.find(t => t.titel.toLowerCase().includes('open digilab'))

    // Gewone templates: alles behalve VibeLab en Open Digilab
    const gewoneTemplates = templates.filter(t =>
        t !== vibeLabTemplate && t !== openDigilabTemplate
    )

    const slots = genereerSlots(startDatum, eindDatum)

    const tellers = {} // { templateId: { Ermelo: 0, Nunspeet: 0 } }
    const weekMateriaal = {} // { 'YYYY-Www': { Ermelo: 'materiaal_str', Nunspeet: 'materiaal_str' } }
    const resultaat = []

    for (const slot of slots) {
        const { datum, locatie, start_tijd, eind_tijd, forceerTemplate } = slot
        const week = getJaarWeek(datum)

        // ── Filterstap 1: Feestdag
        if (FEESTDAGEN.has(datum)) continue

        // ── Filterstap 2: Schoolvakanties
        const vakantieType = getVakantieType(datum)
        if (vakantieType === 'geen') continue
        if (isWeekVoorHoofdvakantie(datum)) continue

        // ── Speciale opmerking
        const specialePeriode = getSpecialePeriode(datum)

        // ── Template bepalen
        let template = null
        let titel = null

        if (forceerTemplate === 'AI VibeLab') {
            template = vibeLabTemplate
            titel = vibeLabTemplate?.titel || 'AI VibeLab'
        } else if (vakantieType === 'open_digilab') {
            template = openDigilabTemplate
            titel = openDigilabTemplate?.titel || 'Open Digilab in de vakantie'
        } else {
            if (gewoneTemplates.length === 0) continue
            template = kiesTemplate(locatie, week, gewoneTemplates, tellers, weekMateriaal)
            if (!template) continue
            titel = template.titel

            // Teller bijhouden
            if (!tellers[template.id]) tellers[template.id] = { Ermelo: 0, Nunspeet: 0 }
            tellers[template.id][locatie]++

            // Weekmateriaal bijhouden voor conflictcheck
            if (template.materiaal_omschrijving) {
                if (!weekMateriaal[week]) weekMateriaal[week] = {}
                weekMateriaal[week][locatie] = template.materiaal_omschrijving
            }
        }

        resultaat.push({
            template_id: template?.id || null,
            titel,
            datum,
            start_tijd,
            eind_tijd,
            locatie,
            doelgroep: template?.doelgroep || null,
            max_deelnemers: template?.max_deelnemers || 10,
            kosten: template?.standaard_kosten || null,
            status: 'concept',
            uitvoerder_id: null,
            ruimte_geregeld: false,
            in_jaarkalender: false,
            in_webshop: false,
            webshop_product_url: null,
            opmerkingen: specialePeriode || null,
            planning_batch_id: batchId,
            aangemaakt_door: aangemaaaktDoorId,
        })
    }

    return resultaat
}

// Exporteer hulpfuncties voor gebruik in UI
export { SCHOOLVAKANTIES, FEESTDAGEN }
