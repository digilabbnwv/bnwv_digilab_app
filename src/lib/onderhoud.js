import { supabase } from './supabase'
import {
    mockGetOpenMeldingen, mockGetMeldingenVoorItem, mockGetAllMeldingen,
    mockMaakMelding, mockWijzigStatus, mockGetMelding
} from './mockDB'
import { notifyNieuweMelding, notifyStatuswijziging } from './meldingNotificatie'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

// Statussen die als "openstaand" gelden (alles behalve afgerond).
export const OPEN_STATUSSEN = ['nieuw', 'in_behandeling']
export const MELDING_STATUSSEN = ['nieuw', 'in_behandeling', 'afgerond']

const SELECT_VELDEN = '*, materiaal(naam, type, qr_code), gemeld_door_medewerker:medewerkers!onderhoudsmeldingen_gemeld_door_fkey(naam, email), opgelost_door_medewerker:medewerkers!onderhoudsmeldingen_opgelost_door_fkey(naam)'

export async function getOpenMeldingen() {
    if (MOCK) return mockGetOpenMeldingen()

    const { data, error } = await supabase
        .from('onderhoudsmeldingen')
        .select('*, materiaal(naam, type, qr_code), gemeld_door_medewerker:medewerkers!onderhoudsmeldingen_gemeld_door_fkey(naam)')
        .neq('status', 'afgerond')
        .order('tijdstip_gemeld', { ascending: false })
    if (error) throw error
    return data
}

export async function getAllMeldingen() {
    if (MOCK) return mockGetAllMeldingen()

    const { data, error } = await supabase
        .from('onderhoudsmeldingen')
        .select(SELECT_VELDEN)
        .order('tijdstip_gemeld', { ascending: false })
    if (error) throw error
    return data
}

export async function getMelding(meldingId) {
    if (MOCK) return mockGetMelding(meldingId)

    const { data, error } = await supabase
        .from('onderhoudsmeldingen')
        .select(SELECT_VELDEN)
        .eq('id', meldingId)
        .single()
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
    let nieuw
    if (MOCK) {
        nieuw = mockMaakMelding({ materiaalId, medewerkerId, typeMelding, toelichting, fotoUrl })
    } else {
        const { data, error } = await supabase
            .from('onderhoudsmeldingen')
            .insert([{
                materiaal_id: materiaalId, gemeld_door: medewerkerId,
                type_melding: typeMelding, toelichting: toelichting || null, foto_url: fotoUrl || null,
                status: 'nieuw', tijdstip_gemeld: new Date().toISOString(),
            }])
            .select()
            .single()
        if (error) throw error
        nieuw = data
    }

    // Notificatie: beheerders krijgen bericht, aanmaker een bevestiging.
    // Mag het indienen niet blokkeren (faalt stil, net als agendaSync).
    await notifyNieuweMelding(nieuw.id)
    return nieuw
}

/**
 * Wijzig de status van een melding en notificeer de aanmaker.
 *
 * @param {string} meldingId
 * @param {string} medewerkerId - wie de wijziging doorvoert (afronder bij 'afgerond')
 * @param {'nieuw'|'in_behandeling'|'afgerond'} nieuweStatus
 */
export async function wijzigStatus(meldingId, medewerkerId, nieuweStatus) {
    if (!MELDING_STATUSSEN.includes(nieuweStatus)) {
        throw new Error(`Ongeldige status: ${nieuweStatus}`)
    }

    if (MOCK) {
        mockWijzigStatus(meldingId, medewerkerId, nieuweStatus)
    } else {
        const nu = new Date().toISOString()
        // Alleen de velden zetten die bij de nieuwe status horen; toelichting
        // (de oorspronkelijke meldingtekst) blijft altijd ongemoeid.
        const patch = { status: nieuweStatus }
        if (nieuweStatus === 'in_behandeling') {
            patch.tijdstip_in_behandeling = nu
        } else if (nieuweStatus === 'afgerond') {
            patch.opgelost_door = medewerkerId
            patch.tijdstip_opgelost = nu
        }
        const { error } = await supabase
            .from('onderhoudsmeldingen')
            .update(patch)
            .eq('id', meldingId)
        if (error) throw error
    }

    await notifyStatuswijziging(meldingId, nieuweStatus)
}

export async function uploadFoto(bestand, materiaalId) {
    if (MOCK) {
        return URL.createObjectURL(bestand)
    }

    const bestandsnaam = `onderhoud/${materiaalId}/${Date.now()}_${bestand.name}`
    const { error } = await supabase.storage.from('fotos').upload(bestandsnaam, bestand)
    if (error) throw error
    const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(bestandsnaam)
    return urlData.publicUrl
}
