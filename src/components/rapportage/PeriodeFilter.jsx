import React, { useState } from 'react'
import { Calendar } from 'lucide-react'

/** Lokale datum als YYYY-MM-DD (zonder UTC-verschuiving). */
function localISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Berekent {van, tot} voor een preset op basis van vandaag.
 * @param {boolean} totEinde - true = tot loopt tot het einde van de periode
 *   (voor vooruitkijkende rapportages zoals workshops); false = tot vandaag
 *   (voor terugkijkende rapportages zoals gebruik en reserveringen).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function periodeVoorPreset(preset, totEinde = false) {
    const nu = new Date()
    const vandaag = localISO(nu)
    if (preset === 'week') {
        const d = new Date(nu)
        const dag = (d.getDay() + 6) % 7 // ma=0
        d.setDate(d.getDate() - dag)
        const eind = new Date(d)
        eind.setDate(eind.getDate() + 6)
        return { van: localISO(d), tot: totEinde ? localISO(eind) : vandaag }
    }
    if (preset === 'jaar') {
        return { van: `${nu.getFullYear()}-01-01`, tot: totEinde ? `${nu.getFullYear()}-12-31` : vandaag }
    }
    // maand (default)
    const maandStart = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}-01`
    const laatsteDag = new Date(nu.getFullYear(), nu.getMonth() + 1, 0)
    return { van: maandStart, tot: totEinde ? localISO(laatsteDag) : vandaag }
}

const PRESETS = [
    { key: 'week', label: 'Deze week' },
    { key: 'maand', label: 'Deze maand' },
    { key: 'jaar', label: 'Dit jaar' },
    { key: 'aangepast', label: 'Aangepast' },
]

/**
 * Periodekiezer met presets + aangepast bereik. Roept onChange aan met
 * { van, tot, label } (datums YYYY-MM-DD).
 */
export default function PeriodeFilter({ preset, onChange, totEinde = false }) {
    const [custom, setCustom] = useState(() => periodeVoorPreset('maand', totEinde))

    function kies(key) {
        if (key === 'aangepast') {
            onChange({ ...custom, preset: 'aangepast', label: 'Aangepast' })
        } else {
            const { van, tot } = periodeVoorPreset(key, totEinde)
            const label = PRESETS.find(p => p.key === key)?.label || ''
            onChange({ van, tot, preset: key, label })
        }
    }

    function wijzigCustom(veld, waarde) {
        const nieuw = { ...custom, [veld]: waarde }
        setCustom(nieuw)
        onChange({ ...nieuw, preset: 'aangepast', label: 'Aangepast' })
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
                {PRESETS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => kies(key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${preset === key
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {key === 'aangepast' && <Calendar size={12} className="inline mr-1" />}
                        {label}
                    </button>
                ))}
            </div>
            {preset === 'aangepast' && (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-text-muted">Van</label>
                    <input
                        type="date"
                        value={custom.van}
                        max={custom.tot}
                        onChange={e => wijzigCustom('van', e.target.value)}
                        className="input py-2 w-auto"
                    />
                    <label className="text-sm text-text-muted">t/m</label>
                    <input
                        type="date"
                        value={custom.tot}
                        min={custom.van}
                        onChange={e => wijzigCustom('tot', e.target.value)}
                        className="input py-2 w-auto"
                    />
                </div>
            )}
        </div>
    )
}
