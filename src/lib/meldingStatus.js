/**
 * meldingStatus.js — Gedeelde labels, kleuren en drempels voor de
 * status van onderhoudsmeldingen (nieuw → in_behandeling → afgerond).
 * Bevat geen React, zodat het ook in de rapportagelaag bruikbaar is.
 */

export const MELDING_STATUS_VOLGORDE = ['nieuw', 'in_behandeling', 'afgerond']

export const MELDING_STATUS_META = {
    nieuw: {
        label: 'Nieuw',
        kleur: 'text-error',
        badge: 'bg-error/10 text-error border-error/30',
        dot: 'bg-error',
    },
    in_behandeling: {
        label: 'In behandeling',
        kleur: 'text-amber-400',
        badge: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
        dot: 'bg-amber-400',
    },
    afgerond: {
        label: 'Afgerond',
        kleur: 'text-success',
        badge: 'bg-success/10 text-success border-success/30',
        dot: 'bg-success',
    },
}

export function meldingStatusLabel(status) {
    return MELDING_STATUS_META[status]?.label || status || 'Onbekend'
}

/**
 * Achterstanddrempels in dagen: langer dan dit in deze status = achterstand.
 * Alleen niet-afgeronde statussen tellen mee.
 */
export const ACHTERSTAND_DAGEN = {
    nieuw: 3,
    in_behandeling: 7,
}
