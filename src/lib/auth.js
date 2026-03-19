import { supabase } from './supabase'
import {
    mockRegistreer, mockInloggen, mockVerifyPin, mockUpdatePincode, mockUpdateNaam
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

export function isBeheerder(medewerker) {
    return medewerker?.rol === 'beheerder'
}

export async function hashPin(pin) {
    const encoder = new TextEncoder()
    const data = encoder.encode(pin + 'digilab_salt_2026')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Registreert een nieuwe medewerker rechtstreeks in de database. */
export async function registreer({ naam, email, pincode }) {
    if (MOCK) return mockRegistreer({ naam, email, pincode })

    const pincode_hash = await hashPin(pincode)
    const { data, error } = await supabase
        .from('medewerkers')
        .insert([{ naam, email: email.toLowerCase().trim(), pincode_hash }])
        .select('id, naam, email, rol, aangemaakt_op')
        .single()

    if (error) {
        if (error.code === '23505') throw new Error('E-mailadres is al in gebruik')
        throw error
    }
    return data
}

/**
 * Logt een medewerker in via directe databasequery.
 * De pincode_hash staat in de WHERE-clause en wordt nooit teruggestuurd.
 */
export async function inloggen({ email, pincode }) {
    if (MOCK) return mockInloggen({ email: email.toLowerCase().trim(), pincode })

    const pincode_hash = await hashPin(pincode)
    const { data, error } = await supabase
        .from('medewerkers')
        .select('id, naam, email, rol, aangemaakt_op')
        .eq('email', email.toLowerCase().trim())
        .eq('pincode_hash', pincode_hash)
        .single()

    if (error || !data) throw new Error('Onjuist e-mailadres of pincode')
    return data
}

/** Logt de huidige medewerker uit. */
export function uitloggen() {
    // Sessie wordt gewist in AuthContext / localStorage
}

/**
 * Verifieert de pincode van een medewerker (bijv. voor PIN-wijziging).
 * Gebruikt pincode_hash in de WHERE-clause — nooit teruggestuurd naar de client.
 */
export async function verifyPin(medewerker_id, pincode) {
    if (MOCK) return mockVerifyPin(medewerker_id, pincode)

    const pincode_hash = await hashPin(pincode)
    const { data, error } = await supabase
        .from('medewerkers')
        .select('id')
        .eq('id', medewerker_id)
        .eq('pincode_hash', pincode_hash)
        .single()
    if (error || !data) throw new Error('Onjuiste pincode')
    return true
}

export async function updatePincode(id, nieuwePincode) {
    if (MOCK) return mockUpdatePincode(id, nieuwePincode)

    const pincode_hash = await hashPin(nieuwePincode)
    const { error } = await supabase
        .from('medewerkers')
        .update({ pincode_hash })
        .eq('id', id)
    if (error) throw error
}

export async function updateNaam(id, naam) {
    if (MOCK) return mockUpdateNaam(id, naam)

    const { error } = await supabase
        .from('medewerkers')
        .update({ naam })
        .eq('id', id)
    if (error) throw error
}
