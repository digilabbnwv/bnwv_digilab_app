import { supabase } from './supabase'
import {
    mockGetAllLabels, mockAddLabel, mockUpdateLabel, mockDeleteLabel,
    mockGetLabelsVoorMateriaal, mockSetLabelsVoorMateriaal,
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

export async function getAllLabels() {
    if (MOCK) return mockGetAllLabels()

    const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('naam')
    if (error) throw error
    return data
}

export async function addLabel({ naam, kleur }) {
    if (MOCK) return mockAddLabel({ naam, kleur })

    const { data, error } = await supabase
        .from('labels')
        .insert([{ naam, kleur: kleur || null }])
        .select()
    if (error) throw error
    return data?.[0]
}

export async function updateLabel(id, updates) {
    if (MOCK) return mockUpdateLabel(id, updates)

    const { error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', id)
    if (error) throw error
}

export async function deleteLabel(id) {
    if (MOCK) return mockDeleteLabel(id)

    const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', id)
    if (error) throw error
}

export async function getLabelsVoorMateriaal(materiaalId) {
    if (MOCK) return mockGetLabelsVoorMateriaal(materiaalId)

    const { data, error } = await supabase
        .from('materiaal_labels')
        .select('label:labels(*)')
        .eq('materiaal_id', materiaalId)
    if (error) throw error
    return (data || []).map(row => row.label).filter(Boolean)
}

export async function setLabelsVoorMateriaal(materiaalId, labelIds) {
    if (MOCK) return mockSetLabelsVoorMateriaal(materiaalId, labelIds)

    const { error: d } = await supabase
        .from('materiaal_labels')
        .delete()
        .eq('materiaal_id', materiaalId)
    if (d) throw d

    if (labelIds.length > 0) {
        const { error: i } = await supabase
            .from('materiaal_labels')
            .insert(labelIds.map(labelId => ({ materiaal_id: materiaalId, label_id: labelId })))
        if (i) throw i
    }
    return getLabelsVoorMateriaal(materiaalId)
}
