import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllMeldingen } from '../lib/onderhoud'
import { LaadIndicator, DatumTijd } from '../components/UI'
import { MeldingStatusBadge } from '../components/MeldingStatus'
import { Wrench, Plus, ChevronRight, Clock, User } from 'lucide-react'

const TYPE_LABELS = {
    kapot: { label: 'Kapot', icon: '🔧', kleur: 'text-error' },
    mist: { label: 'Mist onderdeel', icon: '🔍', kleur: 'text-amber-400' },
    verbruiksmateriaal: { label: 'Verbruiksmateriaal', icon: '🔋', kleur: 'text-blue-400' },
    anders: { label: 'Anders', icon: '💬', kleur: 'text-text-muted' },
}

// Randkleur per status voor de kaart
const RAND = {
    nieuw: 'border-l-error',
    in_behandeling: 'border-l-amber-400',
    afgerond: 'border-l-success/40',
}

export default function MeldingenOverzicht() {
    const [meldingen, setMeldingen] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('openstaand')

    useEffect(() => {
        let actief = true
        getAllMeldingen()
            .then(d => { if (actief) setMeldingen(d) })
            .catch(console.error)
            .finally(() => { if (actief) setLoading(false) })
        return () => { actief = false }
    }, [])

    const tellingen = useMemo(() => ({
        openstaand: meldingen.filter(m => m.status !== 'afgerond').length,
        nieuw: meldingen.filter(m => m.status === 'nieuw').length,
        in_behandeling: meldingen.filter(m => m.status === 'in_behandeling').length,
        afgerond: meldingen.filter(m => m.status === 'afgerond').length,
    }), [meldingen])

    const gefilterd = useMemo(() => {
        if (filter === 'openstaand') return meldingen.filter(m => m.status !== 'afgerond')
        return meldingen.filter(m => m.status === filter)
    }, [meldingen, filter])

    const chips = [
        { key: 'openstaand', label: 'Openstaand', aantal: tellingen.openstaand },
        { key: 'nieuw', label: 'Nieuw', aantal: tellingen.nieuw },
        { key: 'in_behandeling', label: 'In behandeling', aantal: tellingen.in_behandeling },
        { key: 'afgerond', label: 'Afgerond', aantal: tellingen.afgerond },
    ]

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Meldingen</h1>
                    <p className="text-text-muted text-sm mt-0.5">{tellingen.openstaand} openstaand</p>
                </div>
                <Link to="/melding/nieuw" className="btn-accent py-2 px-4 text-sm flex items-center gap-2">
                    <Plus size={16} /> Nieuwe melding
                </Link>
            </div>

            {/* Statusfilters */}
            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
                {chips.map(c => (
                    <button
                        key={c.key}
                        onClick={() => setFilter(c.key)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === c.key
                            ? 'bg-accent text-white shadow-lg shadow-accent/30'
                            : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {c.label} ({c.aantal})
                    </button>
                ))}
            </div>

            {/* Lijst */}
            {loading ? (
                <LaadIndicator />
            ) : gefilterd.length === 0 ? (
                <div className="card p-10 text-center">
                    <Wrench size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">
                        {filter === 'openstaand' ? 'Geen openstaande meldingen 🎉' : 'Geen meldingen in deze categorie'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {gefilterd.map(m => {
                        const typeInfo = TYPE_LABELS[m.type_melding] || { label: m.type_melding, icon: '❓', kleur: 'text-text-muted' }
                        return (
                            <Link
                                key={m.id}
                                to={`/melding/${m.id}`}
                                className={`card overflow-hidden flex items-start gap-3 p-4 hover:bg-bg-hover transition-colors border-l-2 ${RAND[m.status] || 'border-l-overlay/10'}`}
                            >
                                <div className="w-9 h-9 rounded-lg bg-bg-app flex items-center justify-center flex-shrink-0 text-base mt-0.5">
                                    {typeInfo.icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-text-primary truncate">{m.materiaal?.naam || 'Onbekend item'}</p>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-overlay/5 ${typeInfo.kleur}`}>
                                            {typeInfo.label}
                                        </span>
                                        <MeldingStatusBadge status={m.status} />
                                    </div>

                                    {m.toelichting && (
                                        <p className="text-text-secondary text-sm mt-0.5 line-clamp-2">{m.toelichting}</p>
                                    )}

                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        <span className="flex items-center gap-1 text-xs text-text-muted">
                                            <User size={11} />{m.gemeld_door_medewerker?.naam || '—'}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-text-muted">
                                            <Clock size={11} /><DatumTijd tijdstip={m.tijdstip_gemeld} compact />
                                        </span>
                                    </div>
                                </div>

                                <ChevronRight size={16} className="text-text-muted flex-shrink-0 mt-1" />
                            </Link>
                        )
                    })}
                </div>
            )}

            <p className="text-center text-text-muted text-xs mt-4">
                {gefilterd.length} melding{gefilterd.length !== 1 ? 'en' : ''}
            </p>
        </div>
    )
}
