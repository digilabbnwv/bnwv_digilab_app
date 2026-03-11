import { supabase } from './supabase'
import {
    mockGetOpenMeldingen, mockGetMeldingenVoorItem, mockGetAllMeldingen,
    mockMaakMelding, mockSluitMelding
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

export async function getOpenMeldingen() {
    if (MOCK) return mockGetOpenMeldingen()

    const { data, error } = await supabase
        .from('onderhoudsmeldingen')
        .select('*, materiaal(naam, type, qr_code), gemeld_door_medewerker:medewerkers!onderhoudsmeldingen_gemeld_door_fkey(naam)')
        .eq('status', 'open')
        .order('tijdstip_gemeld', { ascending: false })
    if (error) throw error
    return data
}

export async function getAllMeldingen() {
    if (MOCK) return mockGetAllMeldingen()

    const { data, error } = await supabase
        .from('onderhoudsmeldingen')
        .select('*, materiaal(naam, type, qr_code), gemeld_door_medewerker:medewerkers!onderhoudsmeldingen_gemeld_door_fkey(naam), opgelost_door_medewerker:medewerkers!onderhoudsmeldingen_opgelost_door_fkey(naam)')
        .order('tijdstip_gemeld', { ascending: false })
    if (error) throw error
    return data
}

export async function getMeldingenVoorItem(materiaalId) {
    if (MOCK) return mockGetMeldingenVoorItem(materiaalId)

    const { data, error } = await supabase
        .from('onderhoudsmeldingen')
        .select('*, gemeld_door_medewerker:medewerkers!onderhoudsmeldingen_gemeld_door_fkey(naam), opgelost_door_medewerker:medewerkers!onderhoudsmeldingen_opgelost_door_fkey(naam)')
        .eq('materiaal_id', materiaalId)
        .order('tijdstip_gemeld', { ascending: false })
    if (error) throw error
    return data
}

export async function maakMelding({ materiaalId, medewerkerId, typeMelding, toelichting, fotoUrl }) {
    if (MOCK) return mockMaakMelding({ materiaalId, medewerkerId, typeMelding, toelichting, fotoUrl })

    const { data, error } = await supabase
        .from('onderhoudsmeldingen')
        .insert([{
            materiaal_id: materiaalId, gemeld_door: medewerkerId,
            type_melding: typeMelding, toelichting: toelichting || null, foto_url: fotoUrl || null,
            status: 'open', tijdstip_gemeld: new Date().toISOString(),
        }])
        .select()
        .single()
    if (error) throw error
    return data
}

export async function sluitMelding(meldingId, medewerkerId, notitie) {
    if (MOCK) return mockSluitMelding(meldingId, medewerkerId, notitie)

    const { error } = await supabase
        .from('onderhoudsmeldingen')
        .update({
            status: 'opgelost', opgelost_door: medewerkerId,
            tijdstip_opgelost: new Date().toISOString(), toelichting: notitie || null,
        })
        .eq('id', meldingId)
    if (error) throw error
}

export async function uploadFoto(bestand, materiaalId) {
    if (MOCK) {
        return URL.createObjectURL(bestand)
    }

    const bestandsnaam = `onderhoud/${materiaalId}/${Date.now()}_${bestand.name}`
    const { data, error } = await supabase.storage.from('fotos').upload(bestandsnaam, bestand)
    if (error) throw error
    const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(bestandsnaam)
    return urlData.publicUrl
}
