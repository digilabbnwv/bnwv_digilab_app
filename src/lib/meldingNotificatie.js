/**
 * meldingNotificatie.js — E-mailnotificaties voor onderhoudsmeldingen
 *
 * Roept de Edge Function `melding-notificatie` aan, die (net als agenda-sync)
 * veilig doorstuurt naar een Power Automate webhook. De Edge Function zoekt
 * zelf de ontvangers op (beheerders + de aanmaker) met de service-role sleutel;
 * de frontend stuurt alleen de melding-id en de basis-URL van de app mee voor
 * de link in de e-mail.
 *
 * Fouten worden gelogd maar nooit gegooid: een mislukte notificatie mag het
 * indienen of het wijzigen van een melding niet blokkeren.
 */

import { supabase } from './supabase'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

/**
 * Basis-URL van de app inclusief de Vite base path (bijv. op GitHub Pages
 * `https://host/bnwv_digilab_app/`). De Edge Function plakt hier `melding/<id>`
 * achter voor de directe link naar de detailpagina.
 */
function appBasisUrl() {
    if (typeof window === 'undefined') return ''
    const base = import.meta.env.BASE_URL || '/'
    return `${window.location.origin}${base}`.replace(/\/+$/, '/') // exact één sluitende slash
}

async function roepEdgeFunctionAan(payload) {
    if (MOCK) {
        console.info('[meldingNotificatie] Mock-modus — geen echte aanroep:', payload)
        return
    }

    try {
        const { error } = await supabase.functions.invoke('melding-notificatie', { body: payload })
        if (error) {
            console.error('[meldingNotificatie] Notificatie mislukt:', error.message)
        }
    } catch (err) {
        console.error('[meldingNotificatie] Notificatie mislukt:', err)
    }
}

/**
 * Nieuwe melding: beheerders krijgen een melding, de aanmaker een bevestiging.
 * @param {string} meldingId
 */
export async function notifyNieuweMelding(meldingId) {
    if (!meldingId) return
    await roepEdgeFunctionAan({
        actie: 'nieuw',
        melding_id: meldingId,
        app_base_url: appBasisUrl(),
    })
}

/**
 * Statuswijziging: de aanmaker krijgt bericht van de nieuwe status.
 * @param {string} meldingId
 * @param {'nieuw'|'in_behandeling'|'afgerond'} nieuweStatus
 */
export async function notifyStatuswijziging(meldingId, nieuweStatus) {
    if (!meldingId) return
    await roepEdgeFunctionAan({
        actie: 'status',
        melding_id: meldingId,
        nieuwe_status: nieuweStatus,
        app_base_url: appBasisUrl(),
    })
}
