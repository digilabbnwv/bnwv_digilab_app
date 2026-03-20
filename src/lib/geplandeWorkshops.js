import { supabase } from './supabase'
import {
    mockGetAlleGeplandeWorkshops, mockGetGeplandeWorkshop,
    mockMaakGeplandeWorkshop, mockUpdateGeplandeWorkshop,
    mockVerwijderGeplandeWorkshop, mockGetGeplandeWorkshopsVoorPeriode,
    mockGetGeplandeWorkshopsVoorMateriaal,
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

export const WORKSHOP_STATUSSEN = ['concept', 'gepubliceerd', 'geannuleerd']

// ── Helpers ─────────────────────────────────────────────────────

function vandaagStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Ophalen ─────────────────────────────────────────────────────

export async function getAlleGeplandeWorkshops() {
    if (MOCK) return mockGetAlleGeplandeWorkshops()

    const { data, error } = await supabase
        .from('geplande_workshops')
        .select('*, template:workshop_templates(id, titel, materiaal_omschrijving), uitvoerder:medewerkers!uitvoerder_id(id, naam), aangemaakt_door_medewerker:medewerkers!aangemaakt_door(id, naam)')
        .order('datum')
    if (error) throw error
    return data
}

export async function getGeplandeWorkshop(id) {
    if (MOCK) return mockGetGeplandeWorkshop(id)

    const { data, error } = await supabase
        .from('geplande_workshops')
        .select('*, template:workshop_templates(id, titel, materiaal_omschrijving, doelgroep, max_deelnemers, standaard_kosten, standaard_duur_minuten), uitvoerder:medewerkers!uitvoerder_id(id, naam)')
        .eq('id', id)
        .single()
    if (error) throw error

    // Resolve materiaal_ids naar objecten (kan niet via FK join met array)
    if (data?.materiaal_ids?.length) {
        const { data: materialen } = await supabase
            .from('materiaal')
            .select('id, naam, type')
            .in('id', data.materiaal_ids)
        data.gekoppeld_materiaal = materialen || []
    } else {
        data.gekoppeld_materiaal = []
    }

    return data
}

export async function getGeplandeWorkshopsVoorPeriode(vanDatum, totDatum) {
    if (MOCK) return mockGetGeplandeWorkshopsVoorPeriode(vanDatum, totDatum)

    const { data, error } = await supabase
        .from('geplande_workshops')
        .select('*, template:workshop_templates(id, titel, materiaal_omschrijving)')
        .gte('datum', vanDatum)
        .lte('datum', totDatum)
        .order('datum')
    if (error) throw error
    return data
}

/**
 * Geeft aankomende geplande workshops die dit materiaalitem nodig hebben.
 * Gebruikt voor de conflictwaarschuwing op de itempagina.
 */
export async function getGeplandeWorkshopsVoorMateriaal(materiaalId) {
    if (MOCK) return mockGetGeplandeWorkshopsVoorMateriaal(materiaalId)

    const { data, error } = await supabase
        .from('geplande_workshops')
        .select('id, titel, datum, start_tijd, eind_tijd, locatie, status, uitvoerder:medewerkers!uitvoerder_id(naam)')
        .contains('materiaal_ids', [materiaalId])
        .neq('status', 'geannuleerd')
        .gte('datum', vandaagStr())
        .order('datum')
    if (error) throw error
    return data || []
}

// ── Aanmaken ────────────────────────────────────────────────────

export async function maakGeplandeWorkshop(workshop) {
    if (MOCK) return mockMaakGeplandeWorkshop(workshop)

    const { data, error } = await supabase
        .from('geplande_workshops')
        .insert([workshop])
        .select()
    if (error) throw error
    return data?.[0]
}

// ── Bijwerken ───────────────────────────────────────────────────

const GEPLANDE_UPDATE_VELDEN = [
    'titel', 'datum', 'start_tijd', 'eind_tijd', 'locatie',
    'doelgroep', 'max_deelnemers', 'kosten', 'status',
    'uitvoerder_id', 'ruimte_geregeld', 'in_jaarkalender',
    'in_webshop', 'webshop_product_url', 'opmerkingen', 'materiaal_ids',
]

export async function updateGeplandeWorkshop(id, updates) {
    if (MOCK) return mockUpdateGeplandeWorkshop(id, updates)

    const safe = Object.fromEntries(
        Object.entries(updates).filter(([k]) => GEPLANDE_UPDATE_VELDEN.includes(k))
    )
    const { data, error } = await supabase
        .from('geplande_workshops')
        .update(safe)
        .eq('id', id)
        .select()
    if (error) throw error
    return data?.[0]
}

// ── Verwijderen ─────────────────────────────────────────────────

export async function verwijderGeplandeWorkshop(id) {
    if (MOCK) return mockVerwijderGeplandeWorkshop(id)

    const { error } = await supabase
        .from('geplande_workshops')
        .delete()
        .eq('id', id)
    if (error) throw error
}
