import { supabase } from './supabase'
import {
    mockGetAllLesplannen, mockGetLesplan, mockGetLesplannenVoorWorkshop, mockGetLesplannenVoorMateriaal,
    mockAddLesplan, mockUpdateLesplan, mockVerwijderLesplan,
    mockGetAllDoelgroepen, mockGetAllKerndoelen,
    mockGetAllThemas, mockAddThema, mockUpdateThema, mockDeleteThema,
    mockGetAllSeries, mockAddSerie, mockUpdateSerie, mockDeleteSerie,
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

const LESPLAN_SELECT = `*,
    lesplan_labels(label:labels(*)),
    lesplan_doelgroepen(doelgroep:doelgroepen(*)),
    lesplan_kerndoelen(diepgang, kerndoel:kerndoelen(*)),
    lesplan_themas(thema:themas(*)),
    lesplan_series(volgorde, serie:lessenseries(*)),
    lesplan_bestanden(*),
    lesplan_workshops(workshop:workshop_templates(id, titel)),
    lesplan_materiaal(materiaal:materiaal(id, naam, type))`

// Kolommen die rechtstreeks op de lesplannen-tabel staan (rest zijn koppelingen)
const LESPLAN_KOLOMMEN = [
    'titel', 'omschrijving', 'status', 'lesduur_minuten', 'groepsgrootte',
    'voorbereiding', 'benodigdheden', 'lesverloop_intro', 'lesverloop_kern', 'lesverloop_afsluiting',
    'differentiatie', 'evaluatie', 'tips', 'leerdoelen', 'bestand_url',
]

function lesplanKolommen(payload) {
    const out = {}
    for (const k of LESPLAN_KOLOMMEN) if (k in payload) out[k] = payload[k] ?? null
    return out
}

function vlakLesplan(item) {
    if (!item) return item
    return {
        ...item,
        leerdoelen: item.leerdoelen || [],
        labels: (item.lesplan_labels || []).map(r => r.label).filter(Boolean),
        doelgroepen: (item.lesplan_doelgroepen || []).map(r => r.doelgroep).filter(Boolean).sort((a, b) => a.volgorde - b.volgorde),
        kerndoelen: (item.lesplan_kerndoelen || [])
            .map(r => (r.kerndoel ? { ...r.kerndoel, diepgang: r.diepgang || null } : null))
            .filter(Boolean),
        themas: (item.lesplan_themas || []).map(r => r.thema).filter(Boolean).sort((a, b) => (a.volgorde || 0) - (b.volgorde || 0)),
        series: (item.lesplan_series || [])
            .map(r => (r.serie ? { ...r.serie, volgorde: r.volgorde } : null))
            .filter(Boolean)
            .sort((a, b) => (a.volgorde || 0) - (b.volgorde || 0)),
        bestanden: item.lesplan_bestanden || [],
        workshops: (item.lesplan_workshops || []).map(r => r.workshop).filter(Boolean),
        materiaal: (item.lesplan_materiaal || []).map(r => r.materiaal).filter(Boolean),
    }
}

export async function getAllLesplannen() {
    if (MOCK) return mockGetAllLesplannen()

    const { data, error } = await supabase
        .from('lesplannen')
        .select(LESPLAN_SELECT)
        .order('titel')
    if (error) throw error
    return (data || []).map(vlakLesplan)
}

export async function getLesplan(id) {
    if (MOCK) return mockGetLesplan(id)

    const { data, error } = await supabase
        .from('lesplannen')
        .select(LESPLAN_SELECT)
        .eq('id', id)
        .single()
    if (error) throw error
    return vlakLesplan(data)
}

export async function getLesplannenVoorWorkshop(workshopTemplateId) {
    if (MOCK) return mockGetLesplannenVoorWorkshop(workshopTemplateId)

    const { data, error } = await supabase
        .from('lesplan_workshops')
        .select('lesplan:lesplannen(*)')
        .eq('workshop_template_id', workshopTemplateId)
    if (error) throw error
    return (data || []).map(r => r.lesplan).filter(Boolean)
}

export async function getLesplannenVoorMateriaal(materiaalId) {
    if (MOCK) return mockGetLesplannenVoorMateriaal(materiaalId)

    const { data, error } = await supabase
        .from('lesplan_materiaal')
        .select('lesplan:lesplannen(*)')
        .eq('materiaal_id', materiaalId)
    if (error) throw error
    return (data || []).map(r => r.lesplan).filter(Boolean)
}

export async function getAllDoelgroepen() {
    if (MOCK) return mockGetAllDoelgroepen()

    const { data, error } = await supabase
        .from('doelgroepen')
        .select('*')
        .order('volgorde')
    if (error) throw error
    return data
}

export async function getAllKerndoelen({ sector, vakgebied } = {}) {
    if (MOCK) return mockGetAllKerndoelen({ sector, vakgebied })

    let query = supabase.from('kerndoelen').select('*')
    if (sector) query = query.eq('sector', sector)
    if (vakgebied) query = query.eq('vakgebied', vakgebied)
    const { data, error } = await query.order('vakgebied').order('domein').order('code')
    if (error) throw error
    return data
}

// ── Koppeltabellen synchroniseren ────────────────────────────
// Overschrijft steeds de volledige set voor een lesplan (delete + insert),
// zelfde patroon als setLabelsVoorMateriaal in labels.js.

async function syncKoppeling(tabel, lesplanId, kolom, ids) {
    const { error: d } = await supabase.from(tabel).delete().eq('lesplan_id', lesplanId)
    if (d) throw d
    if (ids?.length) {
        const { error: i } = await supabase
            .from(tabel)
            .insert(ids.map(id => ({ lesplan_id: lesplanId, [kolom]: id })))
        if (i) throw i
    }
}

async function syncKerndoelen(lesplanId, kerndoelen) {
    const { error: d } = await supabase.from('lesplan_kerndoelen').delete().eq('lesplan_id', lesplanId)
    if (d) throw d
    if (kerndoelen?.length) {
        const { error: i } = await supabase.from('lesplan_kerndoelen').insert(
            kerndoelen.map(k => ({ lesplan_id: lesplanId, kerndoel_id: k.kerndoel_id, diepgang: k.diepgang || null }))
        )
        if (i) throw i
    }
}

async function syncSeries(lesplanId, series) {
    const { error: d } = await supabase.from('lesplan_series').delete().eq('lesplan_id', lesplanId)
    if (d) throw d
    if (series?.length) {
        const { error: i } = await supabase.from('lesplan_series').insert(
            series.map(s => ({ lesplan_id: lesplanId, serie_id: s.serie_id, volgorde: s.volgorde ?? null }))
        )
        if (i) throw i
    }
}

async function syncBestanden(lesplanId, bestanden) {
    const { error: d } = await supabase.from('lesplan_bestanden').delete().eq('lesplan_id', lesplanId)
    if (d) throw d
    if (bestanden?.length) {
        const { error: i } = await supabase.from('lesplan_bestanden').insert(
            bestanden.map(b => ({
                lesplan_id: lesplanId, bestand_url: b.bestand_url, bestandsnaam: b.bestandsnaam || null,
                soort: b.soort || 'overig', grootte_bytes: b.grootte_bytes ?? null,
            }))
        )
        if (i) throw i
    }
}

async function syncAlleKoppelingen(lesplanId, payload) {
    const { doelgroep_ids, thema_ids, label_ids, workshop_template_ids, materiaal_ids, kerndoelen, series, bestanden } = payload
    const taken = [
        syncKoppeling('lesplan_doelgroepen', lesplanId, 'doelgroep_id', doelgroep_ids),
        syncKoppeling('lesplan_themas', lesplanId, 'thema_id', thema_ids),
        syncKoppeling('lesplan_labels', lesplanId, 'label_id', label_ids),
        syncKoppeling('lesplan_workshops', lesplanId, 'workshop_template_id', workshop_template_ids),
        syncKoppeling('lesplan_materiaal', lesplanId, 'materiaal_id', materiaal_ids),
        syncKerndoelen(lesplanId, kerndoelen),
        syncSeries(lesplanId, series),
    ]
    if (bestanden !== undefined) taken.push(syncBestanden(lesplanId, bestanden))
    await Promise.all(taken)
}

export async function addLesplan(payload) {
    if (MOCK) return mockAddLesplan(payload)

    const insert = { ...lesplanKolommen(payload), aangemaakt_door: payload.aangemaakt_door }
    if (!('status' in insert)) insert.status = 'concept'
    const { data, error } = await supabase
        .from('lesplannen')
        .insert([insert])
        .select()
        .single()
    if (error) throw error

    await syncAlleKoppelingen(data.id, payload)
    return getLesplan(data.id)
}

export async function updateLesplan(id, payload) {
    if (MOCK) return mockUpdateLesplan(id, payload)

    const { error } = await supabase
        .from('lesplannen')
        .update({ ...lesplanKolommen(payload), laatst_bijgewerkt_op: new Date().toISOString() })
        .eq('id', id)
    if (error) throw error

    await syncAlleKoppelingen(id, payload)
    return getLesplan(id)
}

export async function verwijderLesplan(id) {
    if (MOCK) return mockVerwijderLesplan(id)

    const { error } = await supabase.from('lesplannen').delete().eq('id', id)
    if (error) throw error
}

// ── Thema's ──────────────────────────────────────────────────
export async function getAllThemas() {
    if (MOCK) return mockGetAllThemas()
    const { data, error } = await supabase.from('themas').select('*').order('volgorde')
    if (error) throw error
    return data
}

export async function addThema(payload) {
    if (MOCK) return mockAddThema(payload)
    const { data, error } = await supabase
        .from('themas')
        .insert([{ naam: payload.naam, kleur: payload.kleur || null, volgorde: payload.volgorde ?? null }])
        .select()
        .single()
    if (error) throw error
    return data
}

export async function updateThema(id, patch) {
    if (MOCK) return mockUpdateThema(id, patch)
    const { data, error } = await supabase.from('themas').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
}

export async function verwijderThema(id) {
    if (MOCK) return mockDeleteThema(id)
    const { error } = await supabase.from('themas').delete().eq('id', id)
    if (error) throw error
}

// ── Lessenseries ─────────────────────────────────────────────
export async function getAllSeries() {
    if (MOCK) return mockGetAllSeries()
    const { data, error } = await supabase.from('lessenseries').select('*').order('naam')
    if (error) throw error
    return data
}

export async function addSerie(payload) {
    if (MOCK) return mockAddSerie(payload)
    const { data, error } = await supabase
        .from('lessenseries')
        .insert([{ naam: payload.naam, omschrijving: payload.omschrijving || null }])
        .select()
        .single()
    if (error) throw error
    return data
}

export async function updateSerie(id, patch) {
    if (MOCK) return mockUpdateSerie(id, patch)
    const { data, error } = await supabase.from('lessenseries').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
}

export async function verwijderSerie(id) {
    if (MOCK) return mockDeleteSerie(id)
    const { error } = await supabase.from('lessenseries').delete().eq('id', id)
    if (error) throw error
}

// ── Leerlijn-matrix ──────────────────────────────────────────
// Bouwt een dekkingsmatrix uit de gepubliceerde lesbrieven:
// rijen = kerndoelen, kolommen = gebruikte jaargroepen (doelgroepen),
// cel = de lessen die dat kerndoel in die groep raken (met diepgang).
export async function getLeerlijnMatrix({ thema_id } = {}) {
    const [lesplannen, doelgroepen] = await Promise.all([getAllLesplannen(), getAllDoelgroepen()])
    const gepubliceerd = (lesplannen || []).filter(l =>
        l.status === 'gepubliceerd' && (!thema_id || (l.themas || []).some(t => t.id === thema_id))
    )

    const cellen = {}
    const kerndoelMap = new Map()
    const doelgroepGebruikt = new Set()

    for (const l of gepubliceerd) {
        for (const k of (l.kerndoelen || [])) {
            kerndoelMap.set(k.id, k)
            for (const d of (l.doelgroepen || [])) {
                doelgroepGebruikt.add(d.id)
                const key = `${k.id}|${d.id}`
                if (!cellen[key]) cellen[key] = []
                cellen[key].push({ lesplanId: l.id, titel: l.titel, diepgang: k.diepgang || null })
            }
        }
    }

    const kolommen = (doelgroepen || []).filter(d => doelgroepGebruikt.has(d.id))
    const rijen = [...kerndoelMap.values()].sort((a, b) =>
        a.vakgebied.localeCompare(b.vakgebied) || (a.domein || '').localeCompare(b.domein || '') || a.code.localeCompare(b.code)
    )
    return { kolommen, rijen, cellen }
}

// ── Bestanden ────────────────────────────────────────────────
// Upload naar Supabase Storage (bucket 'lesmateriaal'); in mock-modus een lokale object-URL.
// Geeft de publieke URL terug; het koppelen aan een lesplan gebeurt via het bestanden-veld in de payload.
export async function uploadLesbestand(bestand, lesplanId = 'concept') {
    if (MOCK) return URL.createObjectURL(bestand)

    const pad = `lesplannen/${lesplanId}/${Date.now()}_${bestand.name}`
    const { error } = await supabase.storage.from('lesmateriaal').upload(pad, bestand)
    if (error) throw error
    const { data } = supabase.storage.from('lesmateriaal').getPublicUrl(pad)
    return data.publicUrl
}
