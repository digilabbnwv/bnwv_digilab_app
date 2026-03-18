import { supabase, setJwt, clearJwt } from './supabase'
import {
    mockRegistreer, mockInloggen, mockVerifyPin, mockUpdatePincode, mockUpdateNaam
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

export function isBeheerder(medewerker) {
    return medewerker?.rol === 'beheerder'
}

// Lokale hash alleen nog nodig voor verifyPin (pincode-bevestiging binnen de app)
export async function hashPin(pin) {
    const encoder = new TextEncoder()
    const data = encoder.encode(pin + 'digilab_salt_2026')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hersel de JWT-sessie bij het opstarten van de app.
 * Moet aangeroepen worden vóór het eerste Supabase-verzoek.
 */
export function herstelJwtSessie() {
    if (MOCK) return
    const jwt = localStorage.getItem('digilab_jwt')
    if (jwt) setJwt(jwt)
}

/** Registreert een nieuwe medewerker via de Edge Function. */
export async function registreer({ naam, email, pincode }) {
    if (MOCK) return mockRegistreer({ naam, email, pincode })

    const { data, error } = await supabase.functions.invoke('medewerker-auth', {
        body: { action: 'registreer', naam, email, pincode },
    })
    if (error || data?.error) throw new Error(data?.error || 'Registratie mislukt')

    setJwt(data.jwt)
    localStorage.setItem('digilab_jwt', data.jwt)
    return data.medewerker
}

/**
 * Logt een medewerker in via de Edge Function.
 * De Edge Function verifieert de pincode server-side en geeft een JWT terug
 * die wordt gebruikt voor alle verdere Supabase-verzoeken.
 */
export async function inloggen({ email, pincode }) {
    if (MOCK) return mockInloggen({ email: email.toLowerCase().trim(), pincode })

    const { data, error } = await supabase.functions.invoke('medewerker-auth', {
        body: { action: 'login', email, pincode },
    })
    if (error || data?.error) throw new Error(data?.error || 'Onjuist e-mailadres of pincode')

    setJwt(data.jwt)
    localStorage.setItem('digilab_jwt', data.jwt)
    return data.medewerker
}

/** Logt de huidige medewerker uit. */
export function uitloggen() {
    clearJwt()
    localStorage.removeItem('digilab_jwt')
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
