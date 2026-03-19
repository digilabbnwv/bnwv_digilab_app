import { supabase } from './supabase'
import {
    mockGetAlleGeplandeWorkshops, mockGetGeplandeWorkshop,
    mockMaakGeplandeWorkshop, mockUpdateGeplandeWorkshop,
    mockVerwijderGeplandeWorkshop, mockGetGeplandeWorkshopsVoorPeriode,
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

export const WORKSHOP_STATUSSEN = ['concept', 'gepubliceerd', 'geannuleerd']

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
        .select('*, template:workshop_templates(id, titel, materiaal_omschrijving, doelgroep, max_deelnemers, standaard_kosten, standaard_duur_minuten), uitvoerder:medewerkers!uitvoerder_id(id, naam), gekoppeld_materiaal:materiaal!materiaal_id(id, naam, type)')
        .eq('id', id)
        .single()
    if (error) throw error
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
    'in_webshop', 'webshop_product_url', 'opmerkingen', 'materiaal_id',
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
