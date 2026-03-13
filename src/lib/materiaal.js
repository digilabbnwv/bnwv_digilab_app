import { supabase } from './supabase'
import {
    mockGetMateriaalByQR, mockGetMateriaalById, mockGetAllMateriaal,
    mockUitchecken, mockInchecken, mockOverrule,
    mockGetUitgecheckt, mockGetMijnMateriaal, mockGetMijnTransacties,
    mockAddMateriaal, mockGetTransacties, mockUpdateMateriaal, mockPreviewCode,
} from './mockDB'

export { mockPreviewCode }

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

export async function getMateriaalaItem(qrCode) {
    if (MOCK) return mockGetMateriaalByQR(qrCode)

    const { data, error } = await supabase
        .from('materiaal')
        .select(`*, huidige_medewerker:medewerkers!materiaal_huidige_medewerker_id_fkey(id, naam), onderhoudsmeldingen(id, type_melding, status, tijdstip_gemeld)`)
        .eq('qr_code', qrCode)
        .single()
    if (error) throw error
    return data
}

export async function getMateriaalaItemById(id) {
    if (MOCK) return mockGetMateriaalById(id)

    const { data, error } = await supabase
        .from('materiaal')
        .select(`*, huidige_medewerker:medewerkers!materiaal_huidige_medewerker_id_fkey(id, naam), onderhoudsmeldingen(id, type_melding, status, tijdstip_gemeld)`)
        .eq('id', id)
        .single()
    if (error) throw error
    return data
}

export async function getAllMateriaal() {
    if (MOCK) return mockGetAllMateriaal()

    const { data, error } = await supabase
        .from('materiaal')
        .select(`*, huidige_medewerker:medewerkers!materiaal_huidige_medewerker_id_fkey(id, naam), onderhoudsmeldingen(id, status)`)
        .order('naam')
    if (error) throw error
    return data
}

export async function uitchecken(materiaalId, medewerkerId, medewerkernaam, reserveringId = null) {
    if (MOCK) return mockUitchecken(materiaalId, medewerkerId, medewerkernaam, reserveringId)

    const { error: u } = await supabase.from('materiaal').update({
        status: 'in_gebruik', huidige_medewerker_id: medewerkerId,
        huidige_locatie: null, laatste_medewerker_naam: medewerkernaam,
    }).eq('id', materiaalId)
    if (u) throw u

    const transactie = {
        materiaal_id: materiaalId, medewerker_id: medewerkerId,
        type: 'uitchecken', tijdstip: new Date().toISOString(),
    }
    if (reserveringId) transactie.reservering_id = reserveringId

    const { error: l } = await supabase.from('transacties').insert([transactie])
    if (l) throw l

    // Markeer reservering als opgehaald
    if (reserveringId) {
        const { markeerOpgehaald } = await import('./reserveringen')
        await markeerOpgehaald(reserveringId)
    }
}

export async function inchecken(materiaalId, medewerkerId, locatie, vorigeLocatie) {
    if (MOCK) return mockInchecken(materiaalId, medewerkerId, locatie, vorigeLocatie)

    const { error: u } = await supabase.from('materiaal').update({
        status: 'beschikbaar', huidige_medewerker_id: null, huidige_locatie: locatie,
    }).eq('id', materiaalId)
    if (u) throw u

    const type = vorigeLocatie && vorigeLocatie !== locatie ? 'locatiewijziging' : 'inchecken'
    const { error: l } = await supabase.from('transacties').insert([{
        materiaal_id: materiaalId, medewerker_id: medewerkerId,
        type, locatie, tijdstip: new Date().toISOString(),
    }])
    if (l) throw l
}

export async function overrule(materiaalId, medewerkerId, medewerkernaam, vorigeMedewerkerId, locatie) {
    if (MOCK) return mockOverrule(materiaalId, medewerkerId, medewerkernaam, vorigeMedewerkerId, locatie)

    const { error: u } = await supabase.from('materiaal').update({
        status: 'beschikbaar', huidige_medewerker_id: null, huidige_locatie: locatie,
    }).eq('id', materiaalId)
    if (u) throw u

    const { error: l } = await supabase.from('transacties').insert([{
        materiaal_id: materiaalId, medewerker_id: medewerkerId,
        type: 'overrule', locatie, tijdstip: new Date().toISOString(),
        notitie: `Overrule van medewerker ID: ${vorigeMedewerkerId}`,
    }])
    if (l) throw l
}

export async function getTransacties(materiaalId) {
    if (MOCK) return mockGetTransacties(materiaalId)

    const { data, error } = await supabase
        .from('transacties')
        .select('*, medewerker:medewerkers(naam)')
        .eq('materiaal_id', materiaalId)
        .order('tijdstip', { ascending: false })
        .limit(20)
    if (error) throw error
    return data
}

export async function getUitgechecktMateriaal() {
    if (MOCK) return mockGetUitgecheckt()

    const { data, error } = await supabase
        .from('materiaal')
        .select('*, huidige_medewerker:medewerkers!materiaal_huidige_medewerker_id_fkey(naam)')
        .eq('status', 'in_gebruik')
        .order('naam')
    if (error) throw error
    return data
}

export async function getMijnMateriaal(medewerkerId) {
    if (MOCK) return mockGetMijnMateriaal(medewerkerId)

    const { data, error } = await supabase
        .from('materiaal').select('*')
        .eq('huidige_medewerker_id', medewerkerId)
        .order('naam')
    if (error) throw error
    return data
}

export async function getMijnTransacties(medewerkerId) {
    if (MOCK) return mockGetMijnTransacties(medewerkerId)

    const { data, error } = await supabase
        .from('transacties')
        .select('*, materiaal(naam, type)')
        .eq('medewerker_id', medewerkerId)
        .order('tijdstip', { ascending: false })
        .limit(50)
    if (error) throw error
    return data
}

export async function addMateriaal(item) {
    if (MOCK) return mockAddMateriaal(item)

    // Zoek het hoogste volgnummer voor dit categorie-prefix in Supabase
    const prefix = item.categorie_prefix || 'OVER'
    const volledigPrefix = `BNWV-DIGI-${prefix.toUpperCase()}-`
    const { data: bestaande } = await supabase
        .from('materiaal')
        .select('qr_code')
        .like('qr_code', `${volledigPrefix}%`)
        .order('qr_code', { ascending: false })
        .limit(1)

    let volgNummer = 1
    if (bestaande && bestaande.length > 0) {
        const huidigste = bestaande[0].qr_code
        const deel = huidigste.slice(volledigPrefix.length)
        volgNummer = (parseInt(deel, 10) || 0) + 1
    }
    const qr_code = `${volledigPrefix}${String(volgNummer).padStart(4, '0')}`

    const { data, error } = await supabase
        .from('materiaal')
        .insert([{ ...item, qr_code, status: 'beschikbaar' }])
        .select()
        .single()
    if (error) throw error
    return data
}

export async function updateMateriaal(id, updates) {
    if (MOCK) return mockUpdateMateriaal(id, updates)

    const { error } = await supabase
        .from('materiaal')
        .update(updates)
        .eq('id', id)
    if (error) throw error
}
