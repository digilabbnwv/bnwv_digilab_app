import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllMateriaal } from '../lib/materiaal'
import { StatusBadge, LaadIndicator } from '../components/UI'
import { Search, Package, Plus, MapPin, User, AlertTriangle, Pencil } from 'lucide-react'

const LOCATIES = ['Ermelo', 'Nunspeet']

export default function MateriaalOverzicht() {
    const [items, setItems] = useState([])
    const [gefilterd, setGefilterd] = useState([])
    const [zoekterm, setZoekterm] = useState('')
    const [statusFilter, setStatusFilter] = useState('alle')
    const [locatieFilter, setLocatieFilter] = useState('alle')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getAllMateriaal()
            .then(data => { setItems(data); setGefilterd(data) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        let res = items
        if (zoekterm) {
            const q = zoekterm.toLowerCase()
            res = res.filter(i =>
                i.naam?.toLowerCase().includes(q) ||
                i.type?.toLowerCase().includes(q) ||
                i.huidige_locatie?.toLowerCase().includes(q) ||
                i.standaard_locatie?.toLowerCase().includes(q)
            )
        }
        if (statusFilter === 'beschikbaar') res = res.filter(i => i.status === 'beschikbaar')
        if (statusFilter === 'in_gebruik') res = res.filter(i => i.status === 'in_gebruik')
        if (statusFilter === 'melding') res = res.filter(i => i.onderhoudsmeldingen?.some(m => m.status === 'open'))
        if (locatieFilter !== 'alle') {
            res = res.filter(i =>
                i.huidige_locatie === locatieFilter || i.standaard_locatie === locatieFilter
            )
        }
        setGefilterd(res)
    }, [zoekterm, statusFilter, locatieFilter, items])

    const statusKnoppen = [
        { key: 'alle', label: 'Alle' },
        { key: 'beschikbaar', label: 'Beschikbaar' },
        { key: 'in_gebruik', label: 'In gebruik' },
        { key: 'melding', label: '⚠️ Melding' },
    ]

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Materiaal</h1>
                <Link to="/materiaal/nieuw" className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                    <Plus size={16} /> Nieuw
                </Link>
            </div>

            {/* Zoekbalk */}
            <div className="relative mb-3">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="search"
                    className="input pl-10"
                    placeholder="Zoek op naam, type of locatie..."
                    value={zoekterm}
                    onChange={e => setZoekterm(e.target.value)}
                />
            </div>

            {/* Status filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-2 scrollbar-hide">
                {statusKnoppen.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${statusFilter === key
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-bg-surface border border-white/10 text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Locatie filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                <button
                    onClick={() => setLocatieFilter('alle')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${locatieFilter === 'alle'
                        ? 'bg-accent text-white shadow-lg shadow-accent/30'
                        : 'bg-bg-surface border border-white/10 text-text-muted hover:text-text-secondary'
                        }`}
                >
                    <MapPin size={12} className="inline mr-1" />Alle locaties
                </button>
                {LOCATIES.map(loc => (
                    <button
                        key={loc}
                        onClick={() => setLocatieFilter(loc)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${locatieFilter === loc
                            ? 'bg-accent text-white shadow-lg shadow-accent/30'
                            : 'bg-bg-surface border border-white/10 text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        <MapPin size={12} className="inline mr-1" />{loc}
                    </button>
                ))}
            </div>

            {loading ? (
                <LaadIndicator />
            ) : gefilterd.length === 0 ? (
                <div className="card p-8 text-center">
                    <Package size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Geen items gevonden</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {gefilterd.map(item => {
                        const openMeldingen = item.onderhoudsmeldingen?.filter(m => m.status === 'open') || []
                        return (
                            <div key={item.id} className="card flex items-center hover:bg-bg-hover transition-colors">
                                <Link
                                    to={`/item/${item.qr_code}`}
                                    className="flex items-center gap-3 p-4 flex-1 min-w-0"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Package size={18} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-text-primary truncate">{item.naam}</p>
                                            {openMeldingen.length > 0 && (
                                                <AlertTriangle size={14} className="text-error flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-text-muted">{item.type}</p>
                                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                                            {item.status === 'in_gebruik'
                                                ? <><User size={11} /> {item.huidige_medewerker?.naam || 'onbekend'}</>
                                                : <><MapPin size={11} /> {item.huidige_locatie || item.standaard_locatie || '—'}</>
                                            }
                                        </p>
                                    </div>
                                    <StatusBadge status={item.status} />
                                </Link>
                                {/* Bewerken knop */}
                                <Link
                                    to={`/materiaal/${item.id}/bewerken`}
                                    className="p-4 pl-2 text-text-muted hover:text-primary transition-colors flex-shrink-0"
                                    title="Bewerken"
                                >
                                    <Pencil size={16} />
                                </Link>
                            </div>
                        )
                    })}
                </div>
            )}

            <p className="text-center text-text-muted text-xs mt-4">{gefilterd.length} item{gefilterd.length !== 1 ? 's' : ''}</p>
        </div>
    )
}
