import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const PREFIX = 'digilab_weergave_'

function lees(opslagKey, standaard) {
    try {
        return localStorage.getItem(opslagKey) || standaard
    } catch {
        return standaard
    }
}

/**
 * Onthoudt per gebruiker of een overzicht als tabel of tegels getoond wordt.
 * De voorkeur wordt in localStorage bewaard, gescheiden per medewerker, zodat
 * gedeelde apparaten elkaars keuze niet overschrijven.
 *
 * @param {string} sleutel - unieke naam voor dit overzicht (bv. 'materiaal')
 * @param {'tabel'|'tegels'} [standaard='tabel'] - waarde als er nog niets bewaard is
 * @returns {[string, (v: string) => void]} [weergave, setWeergave]
 */
export function useWeergaveVoorkeur(sleutel, standaard = 'tabel') {
    const { medewerker } = useAuth()
    const opslagKey = `${PREFIX}${sleutel}_${medewerker?.id ?? 'anon'}`

    const [weergave, setWeergaveState] = useState(() => lees(opslagKey, standaard))

    // Herlaad de voorkeur wanneer de gebruiker wisselt (login/logout/simulatie).
    // Dit gebeurt tijdens render i.p.v. in een effect, zodat er geen extra
    // render-cyclus met verkeerde waarde tussendoor zit.
    const [vorigeKey, setVorigeKey] = useState(opslagKey)
    if (opslagKey !== vorigeKey) {
        setVorigeKey(opslagKey)
        setWeergaveState(lees(opslagKey, standaard))
    }

    const setWeergave = useCallback((v) => {
        setWeergaveState(v)
        try {
            localStorage.setItem(opslagKey, v)
        } catch {
            /* localStorage niet beschikbaar — voorkeur geldt alleen deze sessie */
        }
    }, [opslagKey])

    return [weergave, setWeergave]
}
