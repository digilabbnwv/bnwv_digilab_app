import { supabase } from './supabase'
import {
    mockRegistreer, mockInloggen, mockVerifyPin, mockUpdatePincode, mockUpdateNaam
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

// Eenvoudige hash functie voor pincode
export async function hashPin(pin) {
    const encoder = new TextEncoder()
    const data = encoder.encode(pin + 'digilab_salt_2026')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function registreer({ naam, email, pincode }) {
    if (MOCK) return mockRegistreer({ naam, email, pincode })

    const pincode_hash = await hashPin(pincode)
    const { data, error } = await supabase
        .from('medewerkers')
        .insert([{ naam, email, pincode_hash }])
        .select()
        .single()
    if (error) throw error
    return data
}

export async function inloggen({ email, pincode }) {
    if (MOCK) return mockInloggen({ email: email.toLowerCase().trim(), pincode })

    const pincode_hash = await hashPin(pincode)
    const { data, error } = await supabase
        .from('medewerkers')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('pincode_hash', pincode_hash)
        .single()
    if (error || !data) throw new Error('Onjuist e-mailadres of pincode')
    return data
}

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
