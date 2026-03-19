import { supabase } from './supabase'
import {
    mockGetAlleWorkshopTemplates, mockGetWorkshopTemplate,
    mockMaakWorkshopTemplate, mockUpdateWorkshopTemplate, mockVerwijderWorkshopTemplate
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

// Vaste keuzelijsten (uit Excel-tab "Gegevens")
export const DOELGROEPEN = [
    '0-4 jr', '4-8 jr', '8-12 jr', '8-15 jr',
    '12+', '13+', '14+', '15+', '16+', '18+', 'Volwassenen'
]

export const LOCATIES = ['Ermelo', 'Nunspeet', 'Harderwijk', 'Putten', 'Elspeet']

// ── Workshop Templates CRUD ──────────────────────────────────

export async function getAlleWorkshopTemplates() {
    if (MOCK) return mockGetAlleWorkshopTemplates()

    const { data, error } = await supabase
        .from('workshop_templates')
        .select('*')
        .order('titel')
    if (error) throw error
    return data
}

export async function getWorkshopTemplate(id) {
    if (MOCK) return mockGetWorkshopTemplate(id)

    const { data, error } = await supabase
        .from('workshop_templates')
        .select('*')
        .eq('id', id)
        .single()
    if (error) throw error

    // Haal gekoppeld materiaal op via de UUID-array
    if (data?.materiaal_ids?.length) {
        const { data: mat } = await supabase
            .from('materiaal')
            .select('id, naam, type')
            .in('id', data.materiaal_ids)
            .order('naam')
        data.gekoppeld_materiaal = mat || []
    } else {
        data.gekoppeld_materiaal = []
    }

    return data
}

export async function maakWorkshopTemplate(template) {
    if (MOCK) return mockMaakWorkshopTemplate(template)

    const { data, error } = await supabase
        .from('workshop_templates')
        .insert([template])
        .select()
        .single()
    if (error) throw error
    return data
}

const TEMPLATE_UPDATE_VELDEN = [
    'titel', 'toelichting', 'materiaal_omschrijving', 'materiaal_ids',
    'min_deelnemers', 'max_deelnemers', 'doelgroep',
    'standaard_kosten', 'standaard_duur_minuten',
    'webshop_url', 'toelichting_url',
]

export async function updateWorkshopTemplate(id, updates) {
    if (MOCK) return mockUpdateWorkshopTemplate(id, updates)

    // Whitelist: alleen toegestane velden doorlaten
    const safe = Object.fromEntries(
        Object.entries(updates).filter(([k]) => TEMPLATE_UPDATE_VELDEN.includes(k))
    )
    const { data, error } = await supabase
        .from('workshop_templates')
        .update(safe)
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function verwijderWorkshopTemplate(id) {
    if (MOCK) return mockVerwijderWorkshopTemplate(id)

    const { error } = await supabase
        .from('workshop_templates')
        .delete()
        .eq('id', id)
    if (error) throw error
}
