/**
 * Medewerkers (gebruikers) beheer — mock + Supabase ready.
 *
 * Beheerdersfuncties voor het aanmaken, bewerken, archiveren (deactiveren) en
 * herstellen van gebruikers, plus het resetten van een pincode. Schrijfrechten
 * worden in de app-laag afgeschermd (alleen beheerders bereiken deze functies
 * via de UI); de database-RLS staat de bewerkingen toe.
 *
 * Archiveren = deactiveren: een gearchiveerde medewerker kan niet meer inloggen
 * (zie auth.inloggen / mockInloggen) en verschijnt niet in keuzelijsten.
 */

import { supabase } from './supabase'
import { hashPin } from './auth'
import {
    mockGetAlleMedewerkers, mockMaakMedewerker, mockUpdateMedewerker,
    mockZetGearchiveerd, mockResetPincode,
} from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

// pincode_hash wordt nooit opgehaald naar de client.
const SELECT_COLS = 'id, naam, email, rol, gearchiveerd, aangemaakt_op'

// ── Ophalen ─────────────────────────────────────────────────────

export async function getAlleMedewerkers({ inclusiefGearchiveerd = false } = {}) {
    if (MOCK) return mockGetAlleMedewerkers({ inclusiefGearchiveerd })

    let query = supabase.from('medewerkers').select(SELECT_COLS).order('naam')
    if (!inclusiefGearchiveerd) query = query.eq('gearchiveerd', false)
    const { data, error } = await query
    if (error) throw error
    return data
}

// ── Aanmaken ────────────────────────────────────────────────────

export async function maakMedewerker({ naam, email, rol = 'medewerker', pincode }) {
    if (MOCK) return mockMaakMedewerker({ naam, email, rol, pincode })

    const pincode_hash = await hashPin(pincode)
    const { data, error } = await supabase
        .from('medewerkers')
        .insert([{ naam: naam.trim(), email: email.toLowerCase().trim(), rol, pincode_hash }])
        .select(SELECT_COLS)
        .single()
    if (error) {
        if (error.code === '23505') throw new Error('E-mailadres is al in gebruik')
        throw error
    }
    return data
}

// ── Bewerken ────────────────────────────────────────────────────

export async function updateMedewerker(id, { naam, email, rol }) {
    if (MOCK) return mockUpdateMedewerker(id, { naam, email, rol })

    const patch = {}
    if (naam !== undefined) patch.naam = naam.trim()
    if (email !== undefined) patch.email = email.toLowerCase().trim()
    if (rol !== undefined) patch.rol = rol

    const { data, error } = await supabase
        .from('medewerkers')
        .update(patch)
        .eq('id', id)
        .select(SELECT_COLS)
        .single()
    if (error) {
        if (error.code === '23505') throw new Error('E-mailadres is al in gebruik')
        throw error
    }
    return data
}

// ── Archiveren (deactiveren) / herstellen ───────────────────────

export async function zetGearchiveerd(id, gearchiveerd) {
    if (MOCK) return mockZetGearchiveerd(id, gearchiveerd)

    const { error } = await supabase
        .from('medewerkers')
        .update({ gearchiveerd })
        .eq('id', id)
    if (error) throw error
}

export const archiveerMedewerker = (id) => zetGearchiveerd(id, true)
export const herstelMedewerker = (id) => zetGearchiveerd(id, false)

// ── Pincode resetten (door beheerder) ───────────────────────────

export async function resetPincode(id, nieuwePincode) {
    if (MOCK) return mockResetPincode(id, nieuwePincode)

    const pincode_hash = await hashPin(nieuwePincode)
    const { error } = await supabase
        .from('medewerkers')
        .update({ pincode_hash })
        .eq('id', id)
    if (error) throw error
}
