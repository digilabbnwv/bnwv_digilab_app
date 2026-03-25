import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAlleWorkshopTemplates, DOELGROEPEN } from '../lib/workshops'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import { Search, BookOpen, Plus, Users, Clock, Tag } from 'lucide-react'

export default function WorkshopCatalogus() {
    const { isBeheerder } = useAuth()
    const [templates, setTemplates] = useState([])
    const [zoekterm, setZoekterm] = useState('')
    const [doelgroepFilter, setDoelgroepFilter] = useState('alle')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getAlleWorkshopTemplates()
            .then(setTemplates)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    // Haal unieke doelgroepen op uit de data
    const beschikbareDoelgroepen = useMemo(() => {
        const set = new Set(templates.map(t => t.doelgroep).filter(Boolean))
        return DOELGROEPEN.filter(d => set.has(d))
    }, [templates])

    const gefilterd = useMemo(() => {
        let res = templates
        if (zoekterm) {
            const q = zoekterm.toLowerCase()
            res = res.filter(t =>
                t.titel?.toLowerCase().includes(q) ||
                t.materiaal_omschrijving?.toLowerCase().includes(q) ||
                t.doelgroep?.toLowerCase().includes(q)
            )
        }
        if (doelgroepFilter !== 'alle') {
            res = res.filter(t => t.doelgroep === doelgroepFilter)
        }
        return res
    }, [zoekterm, doelgroepFilter, templates])

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Workshop onderhoud</h1>
                {isBeheerder && (
                    <Link to="/workshops/onderhoud/nieuw" className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                        <Plus size={16} /> Nieuw
                    </Link>
                )}
            </div>

            {/* Zoekbalk */}
            <div className="relative mb-3">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="search"
                    className="input pl-10"
                    placeholder="Zoek op titel, materiaal of doelgroep..."
                    value={zoekterm}
                    onChange={e => setZoekterm(e.target.value)}
                />
            </div>

            {/* Doelgroep filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                <button
                    onClick={() => setDoelgroepFilter('alle')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${doelgroepFilter === 'alle'
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                    }`}
                >
                    Alle doelgroepen
                </button>
                {beschikbareDoelgroepen.map(dg => (
                    <button
                        key={dg}
                        onClick={() => setDoelgroepFilter(dg)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${doelgroepFilter === dg
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                        }`}
                    >
                        {dg}
                    </button>
                ))}
            </div>

            {loading ? (
                <LaadIndicator />
            ) : gefilterd.length === 0 ? (
                <div className="card p-8 text-center">
                    <BookOpen size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Geen workshops gevonden</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {gefilterd.map(template => (
                        <Link
                            key={template.id}
                            to={`/workshops/onderhoud/${template.id}`}
                            className="card flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors"
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <BookOpen size={18} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-text-primary truncate">{template.titel}</p>
                                {template.materiaal_omschrijving && (
                                    <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                                        <Tag size={11} /> {template.materiaal_omschrijving}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                                    {template.doelgroep && (
                                        <span className="flex items-center gap-1">
                                            <Users size={11} /> {template.doelgroep}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Clock size={11} /> {template.standaard_duur_minuten} min
                                    </span>
                                    <span>max {template.max_deelnemers} deeln.</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <p className="text-center text-text-muted text-xs mt-4">
                {gefilterd.length} workshop{gefilterd.length !== 1 ? 's' : ''}
            </p>
        </div>
    )
}
