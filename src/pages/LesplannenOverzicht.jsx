import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllLesplannen } from '../lib/lesplannen'
import { LaadIndicator } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { Search, GraduationCap, Plus, SlidersHorizontal, ChevronDown, Tag, Users, Package, Target, ExternalLink } from 'lucide-react'

function ChipGroep({ label, icon, opties, geselecteerd, onToggle, render }) {
    const Icon = icon
    if (opties.length === 0) return null
    return (
        <div className="mb-3 last:mb-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Icon size={12} /> {label}
            </p>
            <div className="flex flex-wrap gap-2">
                {opties.map(optie => {
                    const actief = geselecteerd.includes(optie.id)
                    return (
                        <button
                            key={optie.id}
                            onClick={() => onToggle(optie.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${actief
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-bg-surface border-overlay/10 text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            {render ? render(optie) : optie.naam}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default function LesplannenOverzicht() {
    const { isBeheerder } = useAuth()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [zoekterm, setZoekterm] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [doelgroepFilter, setDoelgroepFilter] = useState([])
    const [labelFilter, setLabelFilter] = useState([])
    const [materiaalFilter, setMateriaalFilter] = useState([])
    const [kerndoelFilter, setKerndoelFilter] = useState([])

    useEffect(() => {
        getAllLesplannen()
            .then(setItems)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const toggle = (setter) => (id) => setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

    // Filteropties afgeleid uit de aanwezige data, zodat er geen lege categorieën getoond worden.
    const beschikbareDoelgroepen = useMemo(() => {
        const map = new Map()
        items.forEach(i => (i.doelgroepen || []).forEach(d => map.set(d.id, d)))
        return [...map.values()].sort((a, b) => a.volgorde - b.volgorde)
    }, [items])

    const beschikbareLabels = useMemo(() => {
        const map = new Map()
        items.forEach(i => (i.labels || []).forEach(l => map.set(l.id, l)))
        return [...map.values()].sort((a, b) => a.naam.localeCompare(b.naam))
    }, [items])

    const beschikbaarMateriaal = useMemo(() => {
        const map = new Map()
        items.forEach(i => (i.materiaal || []).forEach(m => map.set(m.id, m)))
        return [...map.values()].sort((a, b) => a.naam.localeCompare(b.naam))
    }, [items])

    const beschikbareKerndoelen = useMemo(() => {
        const map = new Map()
        items.forEach(i => (i.kerndoelen || []).forEach(k => map.set(k.id, k)))
        return [...map.values()].sort((a, b) => a.vakgebied.localeCompare(b.vakgebied) || a.code.localeCompare(b.code))
    }, [items])

    const aantalActieveFilters = doelgroepFilter.length + labelFilter.length + materiaalFilter.length + kerndoelFilter.length

    const gefilterd = useMemo(() => {
        let res = items
        if (zoekterm) {
            const q = zoekterm.toLowerCase()
            res = res.filter(i => i.titel?.toLowerCase().includes(q) || i.omschrijving?.toLowerCase().includes(q))
        }
        if (doelgroepFilter.length) res = res.filter(i => i.doelgroepen?.some(d => doelgroepFilter.includes(d.id)))
        if (labelFilter.length) res = res.filter(i => i.labels?.some(l => labelFilter.includes(l.id)))
        if (materiaalFilter.length) res = res.filter(i => i.materiaal?.some(m => materiaalFilter.includes(m.id)))
        if (kerndoelFilter.length) res = res.filter(i => i.kerndoelen?.some(k => kerndoelFilter.includes(k.id)))
        return res
    }, [items, zoekterm, doelgroepFilter, labelFilter, materiaalFilter, kerndoelFilter])

    return (
        <div className="app-container lg:max-w-6xl pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Lesplannen</h1>
                {isBeheerder && (
                    <Link to="/lesplannen/nieuw" className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                        <Plus size={16} /> Nieuw
                    </Link>
                )}
            </div>

            {/* Zoekbalk */}
            <div className="relative mb-3 lg:max-w-md">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="search"
                    className="input pl-10"
                    placeholder="Zoek op titel of omschrijving..."
                    value={zoekterm}
                    onChange={e => setZoekterm(e.target.value)}
                />
            </div>

            {/* Filters toggle */}
            <button
                onClick={() => setFiltersOpen(v => !v)}
                className="flex items-center gap-2 text-sm text-text-secondary mb-4 hover:text-text-primary transition-colors"
            >
                <SlidersHorizontal size={15} />
                Filters
                {aantalActieveFilters > 0 && (
                    <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {aantalActieveFilters}
                    </span>
                )}
                <ChevronDown size={15} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>

            {filtersOpen && (
                <div className="card p-4 mb-4">
                    <ChipGroep label="Doelgroep" icon={Users} opties={beschikbareDoelgroepen} geselecteerd={doelgroepFilter} onToggle={toggle(setDoelgroepFilter)} />
                    <ChipGroep label="Thema" icon={Tag} opties={beschikbareLabels} geselecteerd={labelFilter} onToggle={toggle(setLabelFilter)} />
                    <ChipGroep label="Materiaal" icon={Package} opties={beschikbaarMateriaal} geselecteerd={materiaalFilter} onToggle={toggle(setMateriaalFilter)} />
                    <ChipGroep
                        label="Kerndoel" icon={Target} opties={beschikbareKerndoelen}
                        geselecteerd={kerndoelFilter} onToggle={toggle(setKerndoelFilter)}
                        render={k => `${k.vakgebied} · ${k.code} (${k.sector})`}
                    />
                </div>
            )}

            {loading ? (
                <LaadIndicator />
            ) : gefilterd.length === 0 ? (
                <div className="card p-8 text-center">
                    <GraduationCap size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Geen lesplannen gevonden</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                    {gefilterd.map(item => (
                        <Link
                            key={item.id}
                            to={`/lesplannen/${item.id}`}
                            className="card flex items-start gap-3 p-4 hover:bg-bg-hover transition-colors"
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <GraduationCap size={18} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-text-primary truncate">{item.titel}</p>
                                    {item.bestand_url && <ExternalLink size={13} className="text-text-muted flex-shrink-0" />}
                                </div>
                                {item.omschrijving && (
                                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{item.omschrijving}</p>
                                )}
                                {item.doelgroepen?.length > 0 && (
                                    <p className="text-xs text-text-muted mt-1">{item.doelgroepen.map(d => d.naam).join(', ')}</p>
                                )}
                                {item.labels?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {item.labels.map(label => (
                                            <span
                                                key={label.id}
                                                className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
                                                style={{ backgroundColor: label.kleur || '#64748B' }}
                                            >
                                                {label.naam}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <p className="text-center text-text-muted text-xs mt-4">{gefilterd.length} lesplan{gefilterd.length !== 1 ? 'nen' : ''}</p>
        </div>
    )
}
