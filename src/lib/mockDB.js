/**
 * Mock database voor lokaal testen zonder Supabase.
 * Gebruikt localStorage als nep-database.
 * Activeer via: VITE_MOCK_MODE=true in .env
 */

import { hashPin } from './auth'

const STORAGE_KEY = 'digilab_mock_db'

function getDB() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
    return null
}

function saveDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

// ── Code generatie ─────────────────────────────────────────────

/**
 * Genereer het volgende volgnummer voor een gegeven categorie-prefix.
 * db.materiaal codes hebben het formaat BNWV-DIGI-XXXX-NNNN
 */
export function getVolgendeNummer(db, categoriePrefix) {
    const volledigPrefix = `BNWV-DIGI-${categoriePrefix.toUpperCase()}-`
    const nummers = db.materiaal
        .map(m => m.qr_code)
        .filter(code => code && code.startsWith(volledigPrefix))
        .map(code => {
            const deel = code.slice(volledigPrefix.length)
            return parseInt(deel, 10) || 0
        })
    const max = nummers.length > 0 ? Math.max(...nummers) : 0
    return max + 1
}

/**
 * Genereer een BNWV code: BNWV-DIGI-XXXX-NNNN
 */
export function genereerCode(db, categoriePrefix) {
    const volgnummer = getVolgendeNummer(db, categoriePrefix)
    return `BNWV-DIGI-${categoriePrefix.toUpperCase()}-${String(volgnummer).padStart(4, '0')}`
}

/**
 * Preview code zonder database (voor formulieren) — geeft een schatting.
 */
export function mockPreviewCode(categoriePrefix) {
    const db = getDB()
    if (!db) return `BNWV-DIGI-${categoriePrefix.toUpperCase()}-0001`
    return genereerCode(db, categoriePrefix)
}

// ── Versie voor automatische migratie ──────────────────────────
const DB_VERSION = 3

export async function initMockDB() {
    const bestaand = getDB()
    if (bestaand && bestaand.version === DB_VERSION) return // Al up-to-date
    localStorage.removeItem(STORAGE_KEY)
    console.log('🔄 Mock database bijgewerkt naar versie', DB_VERSION)

    const pinHash = await hashPin('12345')
    const pinHash2 = await hashPin('99999')

    const med1Id = uuid()
    const med2Id = uuid()

    // Helpers voor hergebruik
    const mat = (naam, merk, type, prefix, nr, locatie, aantal, omschrijving, inhoud, status = 'beschikbaar', medId = null) => ({
        id: uuid(),
        naam,
        merk,
        type,
        categorie_prefix: prefix,
        qr_code: `BNWV-DIGI-${prefix}-${String(nr).padStart(4, '0')}`,
        aantal,
        omschrijving,
        inhoud,
        standaard_locatie: locatie,
        huidige_locatie: status === 'beschikbaar' ? locatie : null,
        huidige_medewerker_id: status === 'in_gebruik' ? medId : null,
        laatste_medewerker_naam: null,
        status,
    })

    // ── Materiaallijst op basis van inventarisatie BNWV Digilab ─────────
    // Brondata: productlijst met merk en aantal per locatie (Ermelo / Nunspeet)
    //
    // Prefix-logica:
    //   SPHE = Sphero        │  CVRT = ClassVR
    //   OZOB = Ozobot        │  LEGO = LEGO sets
    //   BEEB = BeeBot        │  PHOT = Photon Robot
    //   MBIT = Micro:Bit     │  DPRI = 3D-printer
    //   LASR = Lasersnijder

    const materiaalItems = [
        // ── Sphero ──────────────────────────────────────────────────────────
        mat('Sphero Indi — Ermelo', 'Sphero', 'Codeer-robot', 'SPHE', 1, 'Ermelo', 8,
            'Sphero Indi is een rijdende codeerrobot voor jonge leerlingen (4–8 jaar). Stuurt op basis van tekeningen en stickers. Geen schermtijd nodig.',
            '8x Sphero Indi robot, 8x USB-C oplaadkabel, activiteitenkaarten, leerkrachthandleiding, opbergdoos'),

        mat('Sphero Indi — Nunspeet', 'Sphero', 'Codeer-robot', 'SPHE', 2, 'Nunspeet', 8,
            'Sphero Indi is een rijdende codeerrobot voor jonge leerlingen (4–8 jaar). Stuurt op basis van tekeningen en stickers. Geen schermtijd nodig.',
            '8x Sphero Indi robot, 8x USB-C oplaadkabel, activiteitenkaarten, leerkrachthandleiding, opbergdoos'),

        mat('Sphero Bolt Power Pack', 'Sphero', 'Codeer-robot', 'SPHE', 3, 'Ermelo', 15,
            'Sphero BOLT Power Pack: programmeerbare bal met LED-matrix en sensoren. Geschikt voor programmeeronderwijs groep 5 t/m VO. App-gestuurd via Scratch/JavaScript.',
            '15x Sphero BOLT, 15x USB-C oplaadkabel, 1x laadstation, activiteitenkaarten, opbergkoffer'),

        // ── ClassVR ─────────────────────────────────────────────────────────
        mat('ClassVR Set — Ermelo', 'ClassVR', 'VR-set', 'CVRT', 1, 'Ermelo', 8,
            'ClassVR is een educatieve VR-set speciaal ontworpen voor de klas. Inclusief beheerdashboard voor de leerkracht. 360°-ervaringen voor aardrijkskunde, geschiedenis, natuur en meer.',
            '8x ClassVR headset, 8x beschermhoes, 1x leerkracht-tablet met beheerdashboard, oplaadkabels, opbergtas'),

        mat('ClassVR Set — Nunspeet', 'ClassVR', 'VR-set', 'CVRT', 2, 'Nunspeet', 8,
            'ClassVR is een educatieve VR-set speciaal ontworpen voor de klas. Inclusief beheerdashboard voor de leerkracht.',
            '8x ClassVR headset, 8x beschermhoes, 1x leerkracht-tablet met beheerdashboard, oplaadkabels, opbergtas'),

        // ── Ozobot ──────────────────────────────────────────────────────────
        mat('OZOBOT Evo', 'OZOBOT', 'Codeer-robot', 'OZOB', 1, 'Ermelo', 18,
            'OZOBOT Evo is een kleine lijnvolgende codeerrobot. Volgt gekleurde lijnen en reageert op kleurcodes. Programmeerbaar via OzoBlockly (visueel) of Python.',
            '18x OZOBOT Evo robot, 18x USB micro-oplaadkabel, stiftenset, activiteitenblad, opbergdoos'),

        mat('OZOBOT 2.0 Bit', 'OZOBOT', 'Codeer-robot', 'OZOB', 2, 'Nunspeet', 18,
            'OZOBOT Bit 2.0 is de instapversie van de OZOBOT-serie. Volgt lijnen en reageert op kleurcodes. Eenvoudig te gebruiken voor jonge leerlingen.',
            '18x OZOBOT Bit 2.0, 18x USB micro-oplaadkabel, stiftenset, activiteitenblad, opbergdoos'),

        // ── LEGO ────────────────────────────────────────────────────────────
        mat('LEGO Spike Prime', 'LEGO', 'Codeer-robot', 'LEGO', 1, 'Ermelo', 1,
            'LEGO Spike Prime is een uitgebreid programmeer- en robotica-pakket voor groep 6 t/m VO. Combinatie van LEGO-bouwen en Python/Scratch-programmeren.',
            '1x LEGO Spike Prime basisset (inclusief hub, sensoren, motoren), instructieboekje, opbergdoos'),

        mat('LEGO Spike Reserveonderdelen', 'LEGO', 'Overig', 'LEGO', 2, 'Nunspeet', 1,
            'Reserveonderdelen voor de LEGO Spike Prime set. Vervangende onderdelen bij verlies of beschadiging.',
            'Diverse LEGO Technic losse onderdelen, reservewielen, verbindingsstukken, opbergzakjes'),

        mat('LEGO WeDo 2.0', 'LEGO', 'Codeer-robot', 'LEGO', 3, 'Ermelo', 16,
            'LEGO WeDo 2.0 is een robotica-introductiepakket voor groep 3–6. Kinderen bouwen eenvoudige machines en programmeren die via een tablet-app.',
            '16x LEGO WeDo 2.0 basisset (hub, bewegingssensor, kantelstandsensor, bouwstenen), tablet-app, handleiding, opbergdoos'),

        // ── BeeBot ──────────────────────────────────────────────────────────
        mat('BeeBot Set — Ermelo', 'BeeBot', 'Codeer-robot', 'BEEB', 1, 'Ermelo', 6,
            'BeeBot is een bij-vormige programmeerrobot voor de jongste leerlingen (4–7 jaar). Kinderen drukken op de pijltjestoetsen op de BeeBot zelf — geen app of scherm nodig.',
            '6x BeeBot robot, 6x USB oplaadkabel, BeeBot speelmat, activiteitenkaarten, opbergdoos'),

        mat('BeeBot Set — Nunspeet', 'BeeBot', 'Codeer-robot', 'BEEB', 2, 'Nunspeet', 6,
            'BeeBot is een bij-vormige programmeerrobot voor de jongste leerlingen (4–7 jaar). Kinderen drukken op de pijltjestoetsen op de BeeBot zelf — geen app of scherm nodig.',
            '6x BeeBot robot, 6x USB oplaadkabel, BeeBot speelmat, activiteitenkaarten, opbergdoos'),

        mat('BeeBot Extra Set', 'BeeBot', 'Codeer-robot', 'BEEB', 3, 'Ermelo', 6,
            'Extra set BeeBots voor gebruik bij grotere klassen of gelijktijdig gebruik op meerdere locaties.',
            '6x BeeBot robot, 6x USB oplaadkabel, reservemats, opbergdoos'),

        // ── Photon Robot ────────────────────────────────────────────────────
        mat('Photon Robot', 'Photon', 'Codeer-robot', 'PHOT', 1, 'Ermelo', 10,
            'Photon Education Robot is een veelzijdige programmeerrobot voor groep 3 t/m 8. Groeit mee met de leerling via drie progressieve programmeerlagen.',
            '10x Photon robot, 10x USB oplaadkabel, leerkrachthandleiding, leerlingenboekjes, opbergkoffer'),

        // ── Micro:Bit ───────────────────────────────────────────────────────
        mat('Micro:Bit Set — Ermelo', 'Micro:Bit', 'Codeer-robot', 'MBIT', 1, 'Ermelo', 15,
            'BBC Micro:bit v2 is een kleine programmeerbare microcomputer met LED-matrix, knoppen, sensoren en Bluetooth. Geschikt voor groep 7/8 en VO. Programmeerbaar via MakeCode (blokken) of Python.',
            '15x Micro:bit v2 board, 15x USB micro-kabel, 15x batterijhouder + AA-batteries, 1x leerkrachthandleiding, opbergkoffer'),

        mat('Micro:Bit Set — Nunspeet', 'Micro:Bit', 'Codeer-robot', 'MBIT', 2, 'Nunspeet', 15,
            'BBC Micro:bit v2 is een kleine programmeerbare microcomputer met LED-matrix, knoppen, sensoren en Bluetooth. Geschikt voor groep 7/8 en VO.',
            '15x Micro:bit v2 board, 15x USB micro-kabel, 15x batterijhouder + AA-batteries, 1x leerkrachthandleiding, opbergkoffer'),

        // ── 3D-printer ──────────────────────────────────────────────────────
        mat('Bambulab A1 3D-printer — Ermelo', 'Bambulab', '3D-printer', 'DPRI', 1, 'Ermelo', 1,
            'Bambu Lab A1 is een snelle, gebruiksvriendelijke FDM 3D-printer. Plug-and-play instelling, geschikt voor scholen. Kan worden gebruikt voor vakken als techniek, natuur en ontwerp.',
            '1x Bambu Lab A1 printer, 1x PLA filamentrol (standaard), 1x bouwtafelsticker-set, 1x gereedschapset, stroomkabel en USB-kabel, handleiding'),

        mat('Bambulab A1 3D-printer — Nunspeet', 'Bambulab', '3D-printer', 'DPRI', 2, 'Nunspeet', 1,
            'Bambu Lab A1 is een snelle, gebruiksvriendelijke FDM 3D-printer. Plug-and-play instelling, geschikt voor scholen.',
            '1x Bambu Lab A1 printer, 1x PLA filamentrol (standaard), 1x bouwtafelsticker-set, 1x gereedschapset, stroomkabel en USB-kabel, handleiding'),

        // ── Lasersnijder ────────────────────────────────────────────────────
        mat('xTool M1 Lasersnijder — Ermelo', 'xTool', 'Lasersnijder', 'LASR', 1, 'Ermelo', 1,
            'xTool M1 is een hybride lasersnijder/diodelasergraveermachine. Snijdt en graveert op hout, leer, acryl en meer. Geschikt voor maakonderwijs en creatieve projecten. Let op: gebruik altijd ventilatie.',
            '1x xTool M1 machine, 1x lasermodule (10W), 1x ventilatiesysteem, 1x materiaalenset (testmaterialen), stroomkabel, USB-kabel, handleiding, veiligheidsbril'),

        mat('xTool M1 Lasersnijder — Nunspeet', 'xTool', 'Lasersnijder', 'LASR', 2, 'Nunspeet', 1,
            'xTool M1 is een hybride lasersnijder/diodelasergraveermachine. Snijdt en graveert op hout, leer, acryl en meer. Let op: gebruik altijd ventilatie.',
            '1x xTool M1 machine, 1x lasermodule (10W), 1x ventilatiesysteem, 1x materiaalenset (testmaterialen), stroomkabel, USB-kabel, handleiding, veiligheidsbril'),
    ]

    // Sla referenties op voor gebruik in andere tabellen
    const spheroIndiErm = materiaalItems[0]
    const spheroBolt = materiaalItems[2]
    const classvrErm = materiaalItems[3]
    const mbItErm = materiaalItems[13]
    const beebot1 = materiaalItems[10]

    // Zet één item 'in gebruik' bij een medewerker (demo)
    spheroBolt.status = 'in_gebruik'
    spheroBolt.huidige_medewerker_id = med1Id
    spheroBolt.huidige_locatie = null
    spheroBolt.laatste_medewerker_naam = null

    const newDB = {
        version: DB_VERSION,
        medewerkers: [
            { id: med1Id, naam: 'Jasper Geertsma', email: 'jasper@bibliotheek.nl', pincode_hash: pinHash, aangemaakt_op: new Date().toISOString() },
            { id: med2Id, naam: 'Lisa van den Berg', email: 'lisa@bibliotheek.nl', pincode_hash: pinHash2, aangemaakt_op: new Date().toISOString() },
        ],
        materiaal: materiaalItems,
        transacties: [
            {
                id: uuid(), materiaal_id: spheroIndiErm.id, medewerker_id: med2Id,
                type: 'inchecken', locatie: 'Ermelo',
                tijdstip: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), notitie: null,
            },
            {
                id: uuid(), materiaal_id: spheroBolt.id, medewerker_id: med1Id,
                type: 'uitchecken', locatie: null,
                tijdstip: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), notitie: null,
            },
        ],
        onderhoudsmeldingen: [
            {
                id: uuid(), materiaal_id: classvrErm.id, gemeld_door: med1Id,
                type_melding: 'kapot',
                toelichting: 'Één headset opent niet meer — klem in het scharnier',
                foto_url: null, status: 'open', opgelost_door: null,
                tijdstip_gemeld: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                tijdstip_opgelost: null,
            },
            {
                id: uuid(), materiaal_id: mbItErm.id, gemeld_door: med2Id,
                type_melding: 'mist',
                toelichting: '2 USB micro-kabels ontbreken bij inlevering',
                foto_url: null, status: 'open', opgelost_door: null,
                tijdstip_gemeld: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                tijdstip_opgelost: null,
            },
        ],
        reserveringen: [
            {
                id: uuid(), materiaal_id: spheroIndiErm.id, medewerker_id: med2Id,
                van_datum: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                tot_datum: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                toelichting: 'Gastles groep 6 basisschool De Wegwijzer Ermelo',
                status: 'actief', aangemaakt_op: new Date().toISOString(),
            },
            {
                id: uuid(), materiaal_id: beebot1.id, medewerker_id: med1Id,
                van_datum: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                tot_datum: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                toelichting: 'BeeBot-workshop kleutergroep',
                status: 'actief', aangemaakt_op: new Date().toISOString(),
            },
        ],
    }

    saveDB(newDB)
    console.log(`🧪 Mock database v${DB_VERSION} geïnitialiseerd met ${materiaalItems.length} digilab-producten`)
    return newDB
}

export function resetMockDB() {
    localStorage.removeItem(STORAGE_KEY)
    console.log('🔄 Mock database gereset')
}

// ── Auth mock functies ──────────────────────────────────────────

export async function mockRegistreer({ naam, email, pincode }) {
    const db = getDB()
    const pincode_hash = await hashPin(pincode)
    if (db.medewerkers.find(m => m.email === email)) {
        throw { code: '23505', message: 'Dit e-mailadres is al geregistreerd' }
    }
    const nieuw = { id: uuid(), naam, email, pincode_hash, aangemaakt_op: new Date().toISOString() }
    db.medewerkers.push(nieuw)
    saveDB(db)
    return nieuw
}

export async function mockInloggen({ email, pincode }) {
    const db = getDB()
    const pincode_hash = await hashPin(pincode)
    const med = db.medewerkers.find(m => m.email === email && m.pincode_hash === pincode_hash)
    if (!med) throw new Error('Onjuist e-mailadres of pincode')
    return med
}

export async function mockVerifyPin(medewerker_id, pincode) {
    const db = getDB()
    const pincode_hash = await hashPin(pincode)
    const med = db.medewerkers.find(m => m.id === medewerker_id && m.pincode_hash === pincode_hash)
    if (!med) throw new Error('Onjuiste pincode')
    return true
}

export async function mockUpdatePincode(medewerker_id, nieuwePincode) {
    const db = getDB()
    const pincode_hash = await hashPin(nieuwePincode)
    const idx = db.medewerkers.findIndex(m => m.id === medewerker_id)
    if (idx === -1) throw new Error('Medewerker niet gevonden')
    db.medewerkers[idx].pincode_hash = pincode_hash
    saveDB(db)
}

export async function mockUpdateNaam(medewerker_id, naam) {
    const db = getDB()
    const idx = db.medewerkers.findIndex(m => m.id === medewerker_id)
    if (idx === -1) throw new Error('Medewerker niet gevonden')
    db.medewerkers[idx].naam = naam
    saveDB(db)
}

// ── Materiaal mock functies ─────────────────────────────────────

function enrichMateriaal(item, db) {
    const med = db.medewerkers.find(m => m.id === item.huidige_medewerker_id)
    const meldingen = db.onderhoudsmeldingen.filter(o => o.materiaal_id === item.id)
    return {
        ...item,
        huidige_medewerker: med ? { id: med.id, naam: med.naam } : null,
        onderhoudsmeldingen: meldingen,
    }
}

export function mockGetMateriaalByQR(qrCode) {
    const db = getDB()
    const item = db.materiaal.find(m => m.qr_code === qrCode)
    if (!item) throw new Error('Item niet gevonden')
    return enrichMateriaal(item, db)
}

export function mockGetMateriaalById(id) {
    const db = getDB()
    const item = db.materiaal.find(m => m.id === id)
    if (!item) throw new Error('Item niet gevonden')
    return enrichMateriaal(item, db)
}

export function mockGetAllMateriaal() {
    const db = getDB()
    return db.materiaal.map(item => {
        const med = db.medewerkers.find(m => m.id === item.huidige_medewerker_id)
        return {
            ...item,
            huidige_medewerker: med ? { id: med.id, naam: med.naam } : null,
            onderhoudsmeldingen: db.onderhoudsmeldingen.filter(o => o.materiaal_id === item.id),
        }
    }).sort((a, b) => a.naam.localeCompare(b.naam))
}

export function mockUitchecken(materiaalId, medewerkerId, medewerkernaam, reserveringId = null) {
    const db = getDB()
    const idx = db.materiaal.findIndex(m => m.id === materiaalId)
    if (idx === -1) throw new Error('Item niet gevonden')
    db.materiaal[idx] = {
        ...db.materiaal[idx],
        status: 'in_gebruik',
        huidige_medewerker_id: medewerkerId,
        huidige_locatie: null,
        laatste_medewerker_naam: medewerkernaam,
    }
    db.transacties.push({
        id: uuid(), materiaal_id: materiaalId, medewerker_id: medewerkerId,
        type: 'uitchecken', locatie: null, tijdstip: new Date().toISOString(),
        notitie: null, reservering_id: reserveringId,
    })
    // Markeer reservering als opgehaald
    if (reserveringId && db.reserveringen) {
        const resIdx = db.reserveringen.findIndex(r => r.id === reserveringId)
        if (resIdx !== -1) {
            db.reserveringen[resIdx] = { ...db.reserveringen[resIdx], status: 'opgehaald' }
        }
    }
    saveDB(db)
}

export function mockInchecken(materiaalId, medewerkerId, locatie, vorigeLocatie) {
    const db = getDB()
    const idx = db.materiaal.findIndex(m => m.id === materiaalId)
    if (idx === -1) throw new Error('Item niet gevonden')
    db.materiaal[idx] = {
        ...db.materiaal[idx],
        status: 'beschikbaar',
        huidige_medewerker_id: null,
        huidige_locatie: locatie,
    }
    const type = vorigeLocatie && vorigeLocatie !== locatie ? 'locatiewijziging' : 'inchecken'
    db.transacties.push({
        id: uuid(), materiaal_id: materiaalId, medewerker_id: medewerkerId,
        type, locatie, tijdstip: new Date().toISOString(), notitie: null,
    })
    saveDB(db)
}

export function mockOverrule(materiaalId, medewerkerId, medewerkernaam, vorigeMedewerkerId, locatie) {
    const db = getDB()
    const idx = db.materiaal.findIndex(m => m.id === materiaalId)
    if (idx === -1) throw new Error('Item niet gevonden')
    db.materiaal[idx] = {
        ...db.materiaal[idx],
        status: 'beschikbaar',
        huidige_medewerker_id: null,
        huidige_locatie: locatie,
    }
    db.transacties.push({
        id: uuid(), materiaal_id: materiaalId, medewerker_id: medewerkerId,
        type: 'overrule', locatie, tijdstip: new Date().toISOString(),
        notitie: `Overrule van medewerker ID: ${vorigeMedewerkerId}`,
    })
    saveDB(db)
}

export function mockGetUitgecheckt() {
    const db = getDB()
    return db.materiaal
        .filter(m => m.status === 'in_gebruik')
        .map(item => {
            const med = db.medewerkers.find(m => m.id === item.huidige_medewerker_id)
            return { ...item, huidige_medewerker: med ? { naam: med.naam } : null }
        })
}

export function mockGetMijnMateriaal(medewerkerId) {
    const db = getDB()
    return db.materiaal.filter(m => m.huidige_medewerker_id === medewerkerId)
}

export function mockGetMijnTransacties(medewerkerId) {
    const db = getDB()
    return db.transacties
        .filter(t => t.medewerker_id === medewerkerId)
        .map(t => {
            const mat = db.materiaal.find(m => m.id === t.materiaal_id)
            return { ...t, materiaal: mat ? { naam: mat.naam, type: mat.type } : null }
        })
        .sort((a, b) => new Date(b.tijdstip) - new Date(a.tijdstip))
}

export function mockAddMateriaal(item) {
    const db = getDB()
    // Genereer de gestructureerde code op basis van het categorie-prefix
    const prefix = item.categorie_prefix || 'OVER'
    const qr_code = genereerCode(db, prefix)
    const nieuw = {
        id: uuid(),
        ...item,
        qr_code,
        status: 'beschikbaar',
        huidige_medewerker_id: null,
        huidige_locatie: item.standaard_locatie,
    }
    db.materiaal.push(nieuw)
    saveDB(db)
    return nieuw
}

export function mockUpdateMateriaal(id, updates) {
    const db = getDB()
    const idx = db.materiaal.findIndex(m => m.id === id)
    if (idx === -1) throw new Error('Item niet gevonden')
    db.materiaal[idx] = { ...db.materiaal[idx], ...updates }
    saveDB(db)
    return db.materiaal[idx]
}

export function mockGetTransacties(materiaalId) {
    const db = getDB()
    return db.transacties
        .filter(t => t.materiaal_id === materiaalId)
        .map(t => {
            const med = db.medewerkers.find(m => m.id === t.medewerker_id)
            return { ...t, medewerker: med ? { naam: med.naam } : null }
        })
        .sort((a, b) => new Date(b.tijdstip) - new Date(a.tijdstip))
}

// ── Onderhoud mock functies ─────────────────────────────────────

export function mockGetOpenMeldingen() {
    const db = getDB()
    return db.onderhoudsmeldingen
        .filter(m => m.status === 'open')
        .map(m => {
            const mat = db.materiaal.find(i => i.id === m.materiaal_id)
            const med = db.medewerkers.find(i => i.id === m.gemeld_door)
            return {
                ...m,
                materiaal: mat ? { naam: mat.naam, type: mat.type, qr_code: mat.qr_code } : null,
                gemeld_door_medewerker: med ? { naam: med.naam } : null,
            }
        })
        .sort((a, b) => new Date(b.tijdstip_gemeld) - new Date(a.tijdstip_gemeld))
}

export function mockGetAllMeldingen() {
    const db = getDB()
    return db.onderhoudsmeldingen
        .map(m => {
            const mat = db.materiaal.find(i => i.id === m.materiaal_id)
            const med = db.medewerkers.find(i => i.id === m.gemeld_door)
            const opgelostMed = m.opgelost_door ? db.medewerkers.find(i => i.id === m.opgelost_door) : null
            return {
                ...m,
                materiaal: mat ? { naam: mat.naam, type: mat.type, qr_code: mat.qr_code } : null,
                gemeld_door_medewerker: med ? { naam: med.naam } : null,
                opgelost_door_medewerker: opgelostMed ? { naam: opgelostMed.naam } : null,
            }
        })
        .sort((a, b) => new Date(b.tijdstip_gemeld) - new Date(a.tijdstip_gemeld))
}


export function mockGetMeldingenVoorItem(materiaalId) {
    const db = getDB()
    return db.onderhoudsmeldingen
        .filter(m => m.materiaal_id === materiaalId)
        .map(m => {
            const gemeldDoor = db.medewerkers.find(i => i.id === m.gemeld_door)
            const opgelostDoor = m.opgelost_door ? db.medewerkers.find(i => i.id === m.opgelost_door) : null
            return {
                ...m,
                gemeld_door_medewerker: gemeldDoor ? { naam: gemeldDoor.naam } : null,
                opgelost_door_medewerker: opgelostDoor ? { naam: opgelostDoor.naam } : null,
            }
        })
        .sort((a, b) => new Date(b.tijdstip_gemeld) - new Date(a.tijdstip_gemeld))
}

export function mockMaakMelding({ materiaalId, medewerkerId, typeMelding, toelichting, fotoUrl }) {
    const db = getDB()
    const nieuw = {
        id: uuid(), materiaal_id: materiaalId, gemeld_door: medewerkerId,
        type_melding: typeMelding, toelichting: toelichting || null, foto_url: fotoUrl || null,
        status: 'open', opgelost_door: null,
        tijdstip_gemeld: new Date().toISOString(), tijdstip_opgelost: null,
    }
    db.onderhoudsmeldingen.push(nieuw)
    saveDB(db)
    return nieuw
}

export function mockSluitMelding(meldingId, medewerkerId, notitie) {
    const db = getDB()
    const idx = db.onderhoudsmeldingen.findIndex(m => m.id === meldingId)
    if (idx === -1) throw new Error('Melding niet gevonden')
    db.onderhoudsmeldingen[idx] = {
        ...db.onderhoudsmeldingen[idx],
        status: 'opgelost',
        opgelost_door: medewerkerId,
        tijdstip_opgelost: new Date().toISOString(),
        toelichting: notitie || db.onderhoudsmeldingen[idx].toelichting,
    }
    saveDB(db)
}

// ── Reserveringen mock functies ─────────────────────────────────

function enrichReservering(r, db) {
    const mat = db.materiaal.find(m => m.id === r.materiaal_id)
    const med = db.medewerkers.find(m => m.id === r.medewerker_id)
    return {
        ...r,
        materiaal: mat ? { id: mat.id, naam: mat.naam, type: mat.type, qr_code: mat.qr_code } : null,
        medewerker: med ? { id: med.id, naam: med.naam } : null,
    }
}

export function mockGetAlleReserveringen() {
    const db = getDB()
    if (!db.reserveringen) return []
    return db.reserveringen
        .filter(r => r.status === 'actief')
        .map(r => enrichReservering(r, db))
        .sort((a, b) => a.van_datum.localeCompare(b.van_datum))
}

export function mockGetReserveringenVoorItem(materiaalId) {
    const db = getDB()
    if (!db.reserveringen) return []
    const vandaag = new Date().toISOString().slice(0, 10)
    return db.reserveringen
        .filter(r => r.materiaal_id === materiaalId && r.status === 'actief' && r.tot_datum >= vandaag)
        .map(r => enrichReservering(r, db))
        .sort((a, b) => a.van_datum.localeCompare(b.van_datum))
}

export function mockGetMijnReserveringen(medewerkerId) {
    const db = getDB()
    if (!db.reserveringen) return []
    const vandaag = new Date().toISOString().slice(0, 10)
    return db.reserveringen
        .filter(r => r.medewerker_id === medewerkerId && r.status === 'actief' && r.tot_datum >= vandaag)
        .map(r => enrichReservering(r, db))
        .sort((a, b) => a.van_datum.localeCompare(b.van_datum))
}

export function mockMaakReservering({ materiaalId, medewerkerId, vanDatum, totDatum, toelichting }) {
    const db = getDB()
    if (!db.reserveringen) db.reserveringen = []
    const nieuw = {
        id: uuid(),
        materiaal_id: materiaalId,
        medewerker_id: medewerkerId,
        van_datum: vanDatum,
        tot_datum: totDatum,
        toelichting: toelichting || null,
        status: 'actief',
        aangemaakt_op: new Date().toISOString(),
    }
    db.reserveringen.push(nieuw)
    saveDB(db)
    return enrichReservering(nieuw, db)
}

export function mockAnnuleerReservering(reserveringId) {
    const db = getDB()
    if (!db.reserveringen) return
    const idx = db.reserveringen.findIndex(r => r.id === reserveringId)
    if (idx === -1) throw new Error('Reservering niet gevonden')
    db.reserveringen[idx] = { ...db.reserveringen[idx], status: 'geannuleerd' }
    saveDB(db)
}

export function mockMarkeerOpgehaald(reserveringId) {
    const db = getDB()
    if (!db.reserveringen) return
    const idx = db.reserveringen.findIndex(r => r.id === reserveringId)
    if (idx === -1) throw new Error('Reservering niet gevonden')
    db.reserveringen[idx] = { ...db.reserveringen[idx], status: 'opgehaald' }
    saveDB(db)
}

