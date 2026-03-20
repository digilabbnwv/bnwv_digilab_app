import { useState, useEffect } from 'react'
import { getClaimMapVoorMaand } from '../lib/beschikbaarheid'
import { useAuth } from '../context/AuthContext'

const CLAIM_KLEUREN = {
    eigen_reservering: 'bg-primary',
    reservering: 'bg-amber-500',
    workshop: 'bg-error',
    uitgecheckt: 'bg-sky-500',
}

const CLAIM_LABELS = {
    eigen_reservering: 'Jouw reservering',
    reservering: 'Reservering collega',
    workshop: 'Workshop',
    uitgecheckt: 'Uitgecheckt',
}

/**
 * Visuele beschikbaarheidsindicator: gekleurde bolletjes per dag.
 *
 * @param {string} materiaalId
 * @param {number} [aantalDagen=14] - hoeveel dagen vooruit tonen
 * @param {boolean} [compact=false] - compact formaat (zonder labels/tooltip)
 */
export default function BeschikbaarheidIndicator({ materiaalId, aantalDagen = 14, compact = false }) {
    const { medewerker } = useAuth()
    const [claimMap, setClaimMap] = useState({})
    const [loading, setLoading] = useState(true)
    const [tooltip, setTooltip] = useState(null)

    useEffect(() => {
        if (!materiaalId) return
        let cancelled = false

        async function load() {
            setLoading(true)
            const vandaag = new Date()
            const eindDatum = new Date()
            eindDatum.setDate(eindDatum.getDate() + aantalDagen)

            // Kan over twee maanden lopen
            const maanden = new Set()
            maanden.add(`${vandaag.getFullYear()}-${vandaag.getMonth()}`)
            maanden.add(`${eindDatum.getFullYear()}-${eindDatum.getMonth()}`)

            const gecombineerd = {}
            for (const key of maanden) {
                const [j, m] = key.split('-').map(Number)
                const map = await getClaimMapVoorMaand(materiaalId, j, m, medewerker?.id)
                Object.assign(gecombineerd, map)
            }

            if (!cancelled) {
                setClaimMap(gecombineerd)
                setLoading(false)
            }
        }

        load().catch(err => {
            console.error('BeschikbaarheidIndicator fout:', err)
            if (!cancelled) setLoading(false)
        })

        return () => { cancelled = true }
    }, [materiaalId, aantalDagen, medewerker?.id])

    if (loading) {
        return (
            <div className="flex gap-0.5">
                {Array.from({ length: compact ? 7 : aantalDagen }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-overlay/10 animate-pulse" />
                ))}
            </div>
        )
    }

    // Bouw dag-array
    const dagen = []
    const vandaag = new Date()
    for (let i = 0; i < aantalDagen; i++) {
        const d = new Date(vandaag)
        d.setDate(d.getDate() + i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const claims = claimMap[key] || []
        dagen.push({ datum: key, dag: d.getDate(), dagNaam: d.toLocaleDateString('nl-NL', { weekday: 'short' }).slice(0, 2), claims })
    }

    // Bepaal hoogste prioriteit claim per dag
    function topClaim(claims) {
        if (claims.length === 0) return null
        // Prioriteit: workshop > reservering > eigen_reservering > uitgecheckt
        const prio = ['workshop', 'reservering', 'eigen_reservering', 'uitgecheckt']
        for (const type of prio) {
            const c = claims.find(cl => cl.type === type)
            if (c) return c
        }
        return claims[0]
    }

    if (compact) {
        return (
            <div className="flex gap-0.5 items-center">
                {dagen.map(({ datum, claims }) => {
                    const top = topClaim(claims)
                    return (
                        <div
                            key={datum}
                            className={`w-2 h-2 rounded-full ${top ? CLAIM_KLEUREN[top.type] || 'bg-overlay/20' : 'bg-success/40'}`}
                            title={top ? `${formatDatumKort(datum)}: ${top.beschrijving}` : `${formatDatumKort(datum)}: Beschikbaar`}
                        />
                    )
                })}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1">
                {dagen.map(({ datum, dag, dagNaam, claims }) => {
                    const top = topClaim(claims)
                    const isVandaag = datum === dagen[0].datum
                    return (
                        <button
                            key={datum}
                            type="button"
                            className="flex flex-col items-center gap-0.5 group relative"
                            onMouseEnter={() => setTooltip({ datum, claims })}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={() => setTooltip(t => t?.datum === datum ? null : { datum, claims })}
                        >
                            <span className={`text-[9px] leading-none ${isVandaag ? 'text-primary font-bold' : 'text-text-muted'}`}>
                                {dagNaam}
                            </span>
                            <div
                                className={`w-3.5 h-3.5 rounded-full border transition-transform group-hover:scale-125 ${
                                    top
                                        ? `${CLAIM_KLEUREN[top.type]} border-transparent`
                                        : 'bg-success/30 border-success/40'
                                }`}
                            />
                            <span className={`text-[8px] leading-none ${isVandaag ? 'text-primary font-bold' : 'text-text-muted'}`}>
                                {dag}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Tooltip */}
            {tooltip && tooltip.claims.length > 0 && (
                <div className="bg-bg-surface border border-overlay/20 rounded-lg p-2.5 text-xs space-y-1">
                    <p className="font-medium text-text-secondary">{formatDatumKort(tooltip.datum)}</p>
                    {tooltip.claims.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${CLAIM_KLEUREN[c.type] || 'bg-overlay/20'}`} />
                            <span className="text-text-primary">{c.beschrijving}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Legenda */}
            {!compact && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <LegendaItem kleur="bg-success/30" label="Beschikbaar" />
                    <LegendaItem kleur="bg-primary" label="Jouw reservering" />
                    <LegendaItem kleur="bg-amber-500" label="Collega" />
                    <LegendaItem kleur="bg-error" label="Workshop" />
                    <LegendaItem kleur="bg-sky-500" label="Uitgecheckt" />
                </div>
            )}
        </div>
    )
}

function LegendaItem({ kleur, label }) {
    return (
        <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${kleur}`} />
            <span className="text-[10px] text-text-muted">{label}</span>
        </div>
    )
}

function formatDatumKort(iso) {
    const [, m, d] = iso.split('-')
    return `${parseInt(d)}-${parseInt(m)}`
}
