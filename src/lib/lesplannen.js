import { supabase } from './supabase'
import {
    mockGetAllLesplannen, mockGetLesplan, mockGetLesplannenVoorWorkshop, mockGetLesplannenVoorMateriaal,
    mockAddLesplan, mockUpdateLesplan, mockVerwijderLesplan,
    mockGetAllDoelgroepen, mockGetAllKerndoelen,
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

const LESPLAN_SELECT = `*,
    lesplan_labels(label:labels(*)),
    lesplan_doelgroepen(doelgroep:doelgroepen(*)),
    lesplan_kerndoelen(kerndoel:kerndoelen(*)),
    lesplan_workshops(workshop:workshop_templates(id, titel)),
    lesplan_materiaal(materiaal:materiaal(id, naam, type))`

function vlakLesplan(item) {
    if (!item) return item
    return {
        ...item,
        labels: (item.lesplan_labels || []).map(r => r.label).filter(Boolean),
        doelgroepen: (item.lesplan_doelgroepen || []).map(r => r.doelgroep).filter(Boolean).sort((a, b) => a.volgorde - b.volgorde),
        kerndoelen: (item.lesplan_kerndoelen || []).map(r => r.kerndoel).filter(Boolean),
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

async function syncAlleKoppelingen(lesplanId, { doelgroep_ids, kerndoel_ids, label_ids, workshop_template_ids, materiaal_ids }) {
    await Promise.all([
        syncKoppeling('lesplan_doelgroepen', lesplanId, 'doelgroep_id', doelgroep_ids),
        syncKoppeling('lesplan_kerndoelen', lesplanId, 'kerndoel_id', kerndoel_ids),
        syncKoppeling('lesplan_labels', lesplanId, 'label_id', label_ids),
        syncKoppeling('lesplan_workshops', lesplanId, 'workshop_template_id', workshop_template_ids),
        syncKoppeling('lesplan_materiaal', lesplanId, 'materiaal_id', materiaal_ids),
    ])
}

export async function addLesplan(payload) {
    if (MOCK) return mockAddLesplan(payload)

    const { titel, omschrijving, bestand_url, aangemaakt_door } = payload
    const { data, error } = await supabase
        .from('lesplannen')
        .insert([{ titel, omschrijving: omschrijving || null, bestand_url: bestand_url || null, aangemaakt_door }])
        .select()
        .single()
    if (error) throw error

    await syncAlleKoppelingen(data.id, payload)
    return getLesplan(data.id)
}

export async function updateLesplan(id, payload) {
    if (MOCK) return mockUpdateLesplan(id, payload)

    const { titel, omschrijving, bestand_url } = payload
    const { error } = await supabase
        .from('lesplannen')
        .update({
            titel, omschrijving: omschrijving || null, bestand_url: bestand_url || null,
            laatst_bijgewerkt_op: new Date().toISOString(),
        })
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
