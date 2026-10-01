/**
 * pincodeReset.js — "Pincode vergeten"-flow
 *
 * Roept de Edge Function `pincode-reset` aan. Die zoekt de medewerker
 * server-side op, mailt een eenmalige resetlink (via Power Automate) en zet bij
 * het herstellen de nieuwe pincode. Het resettoken en de pincode_hash komen zo
 * nooit via een directe databasequery van de client.
 *
 * In mock-modus wordt de resetlink in de console gelogd in plaats van gemaild.
 */

import { supabase } from './supabase'
import { mockVraagPincodeResetAan, mockControleerResetToken, mockHerstelPincode } from './mockDB'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

async function roepAan(payload) {
    const { data, error } = await supabase.functions.invoke('pincode-reset', { body: payload })
    if (error) {
        // Bij een 4xx/5xx zit de foutmelding van de Edge Function in de response-body.
        let bericht = null
        try { bericht = (await error.context?.json?.())?.fout } catch { /* geen JSON-body */ }
        throw new Error(bericht || 'Er ging iets mis. Probeer het later opnieuw.')
    }
    return data
}

export function isGeldigePincode(pincode) {
    return /^\d{5}$/.test(pincode ?? '')
}

/**
 * Vraagt een resetlink aan. Geeft geen uitsluitsel of het adres bestaat:
 * de UI toont altijd dezelfde bevestiging.
 */
export async function vraagPincodeResetAan(email) {
    const schoon = (email ?? '').toLowerCase().trim()
    if (!schoon.includes('@')) throw new Error('Voer een geldig e-mailadres in')

    if (MOCK) {
        const token = mockVraagPincodeResetAan(schoon)
        if (token) {
            const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/+$/, '/')
            console.info(`[pincodeReset] Mock-modus — resetlink: ${base}pincode-herstellen?token=${token}`)
        }
        return
    }

    await roepAan({ actie: 'aanvragen', email: schoon })
}

/** Controleert of een resettoken (nog) geldig is. */
export async function controleerResetToken(token) {
    if (!token) return false
    if (MOCK) return mockControleerResetToken(token)

    const data = await roepAan({ actie: 'controleren', token })
    return !!data?.geldig
}

/** Stelt met een geldig resettoken een nieuwe pincode in. */
export async function herstelPincode(token, nieuwePincode) {
    if (!token) throw new Error('Deze link is ongeldig of verlopen. Vraag een nieuwe aan.')
    if (!isGeldigePincode(nieuwePincode)) throw new Error('Je pincode moet 5 cijfers zijn')
    if (MOCK) return mockHerstelPincode(token, nieuwePincode)

    await roepAan({ actie: 'herstellen', token, pincode: nieuwePincode })
}
