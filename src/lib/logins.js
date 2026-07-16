/**
 * Logins module — mock + Supabase ready
 *
 * Data model:
 *   logins (id, medewerker_id, tijdstip)
 *
 * Gebruikt voor de periodieke metrics-rapportage (inlogfrequentie per medewerker).
 */

import { supabase } from './supabase'
import { mockLogLogin } from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

/** Registreert een login-moment voor een medewerker. Faalt nooit hardop — een logging-fout mag de login zelf niet blokkeren. */
export async function logLogin(medewerkerId) {
    try {
        if (MOCK) return mockLogLogin(medewerkerId)

        const { error } = await supabase
            .from('logins')
            .insert([{ medewerker_id: medewerkerId }])
        if (error) throw error
    } catch (error) {
        console.error('Kon login niet registreren:', error)
    }
}
