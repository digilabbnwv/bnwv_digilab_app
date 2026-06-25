/**
 * Vertaalt een willekeurige fout naar een korte, mensvriendelijke NL-melding.
 * Het ruwe foutobject gaat naar de console (voor debugging), nooit naar het scherm.
 *
 * - Netwerkfouten krijgen een herkenbare melding.
 * - Korte, door de app zelf gegooide meldingen (bv. "Onjuiste pincode") worden doorgelaten.
 * - Technische fouten (Supabase, SQL, JSON, stack traces) worden vervangen door de fallback.
 *
 * @param {unknown} err - de opgevangen fout
 * @param {string} fallback - vriendelijke standaardtekst voor onbekende/technische fouten
 * @returns {string}
 */
export function foutTekst(err, fallback = 'Er ging iets mis. Probeer het opnieuw.') {
    if (err) console.error('[Digilab] actie mislukt:', err)

    const msg = typeof err === 'string' ? err : err?.message

    if (msg && /failed to fetch|networkerror|load failed|fetch failed|timeout/i.test(msg)) {
        return 'Geen verbinding — controleer je internet en probeer het opnieuw.'
    }

    // Korte, al-vriendelijke meldingen doorlaten; technische details blokkeren.
    const ziettechnisch = /[{}[\]]|https?:|supabase|column|relation|constraint|syntax|duplicate key|violates|undefined|null|stack/i
    if (msg && msg.length <= 100 && !ziettechnisch.test(msg)) {
        return msg
    }

    return fallback
}
