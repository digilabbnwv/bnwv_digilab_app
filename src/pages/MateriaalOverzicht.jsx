import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAllMateriaal } from '../lib/materiaal'
import { StatusBadge, LaadIndicator } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { useWeergaveVoorkeur } from '../hooks/useWeergaveVoorkeur'
import WeergaveToggle from '../components/WeergaveToggle'
import BeschikbaarheidIndicator from '../components/BeschikbaarheidIndicator'
import { Search, Package, Plus, MapPin, User, AlertTriangle, QrCode, Tag, Settings, Archive } from 'lucide-react'

const LOCATIES = ['Ermelo', 'Nunspeet', 'Harderwijk', 'Putten', 'Elspeet', 'Anders']

export default function MateriaalOverzicht() {
    const { isBeheerder } = useAuth()
    const [items, setItems] = useState([])
    const [zoekterm, setZoekterm] = useState('')
    const [statusFilter, setStatusFilter] = useState('alle')
    const [locatieFilter, setLocatieFilter] = useState('alle')
    const [labelFilter, setLabelFilter] = useState('alle')
    const [loading, setLoading] = useState(true)
    const [weergave, setWeergave] = useWeergaveVoorkeur('materiaal')

    useEffect(() => {
        getAllMateriaal()
            .then(setItems)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const beschikbareLabels = useMemo(() => {
        const map = new Map()
        items.forEach(i => (i.labels || []).forEach(l => map.set(l.id, l)))
        return [...map.values()].sort((a, b) => a.naam.localeCompare(b.naam))
    }, [items])

    const gefilterd = useMemo(() => {
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
        if (statusFilter === 'melding') res = res.filter(i => i.onderhoudsmeldingen?.some(m => m.status !== 'afgerond'))
        if (locatieFilter !== 'alle') {
            res = res.filter(i =>
                i.huidige_locatie === locatieFilter || i.standaard_locatie === locatieFilter
            )
        }
        if (labelFilter !== 'alle') {
            res = res.filter(i => i.labels?.some(l => l.id === labelFilter))
        }
        return res
    }, [zoekterm, statusFilter, locatieFilter, labelFilter, items])

    const statusKnoppen = [
        { key: 'alle', label: 'Alle' },
        { key: 'beschikbaar', label: 'Beschikbaar' },
        { key: 'in_gebruik', label: 'In gebruik' },
        { key: 'melding', label: '⚠️ Melding' },
    ]

    return (
        <div className="app-container lg:max-w-6xl pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Materiaal</h1>
                <div className="flex items-center gap-2">
                    <Link
                        to="/item/scan"
                        className="btn-ghost py-2 px-3 text-sm flex items-center gap-2"
                        aria-label="QR-code scannen"
                    >
                        <QrCode size={16} /> Scan
                    </Link>
                    {isBeheerder && (
                        <Link
                            to="/materiaal/labels"
                            className="btn-ghost py-2 px-3 text-sm flex items-center gap-2"
                            aria-label="Labels beheren"
                        >
                            <Settings size={16} /> Labels
                        </Link>
                    )}
                    {isBeheerder && (
                        <Link
                            to="/materiaal/archief"
                            className="btn-ghost py-2 px-3 text-sm flex items-center gap-2"
                            aria-label="Gearchiveerd materiaal"
                        >
                            <Archive size={16} /> Archief
                        </Link>
                    )}
                    {isBeheerder && (
                        <Link to="/materiaal/nieuw" className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                            <Plus size={16} /> Nieuw
                        </Link>
                    )}
                </div>
            </div>

            {/* Zoekbalk */}
            <div className="relative mb-3 lg:max-w-md">
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
                            : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Locatie filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setLocatieFilter('alle')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${locatieFilter === 'alle'
                        ? 'bg-accent text-white shadow-lg shadow-accent/30'
                        : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                        }`}
                >
                    <MapPin size={12} className="inline mr-1" />Alle locaties
                </button>
                {LOCATIES.map(loc => (
                    <button
                        key={loc}
                        onClick={() => setLocatieFilter(loc)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${locatieFilter === loc
                            ? 'bg-accent text-white shadow-lg shadow-accent/30'
                            : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        <MapPin size={12} className="inline mr-1" />{loc}
                    </button>
                ))}
            </div>

            {/* Label filters */}
            {beschikbareLabels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    <button
                        onClick={() => setLabelFilter('alle')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${labelFilter === 'alle'
                            ? 'bg-bg-surface border border-primary text-primary'
                            : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        <Tag size={12} className="inline mr-1" />Alle labels
                    </button>
                    {beschikbareLabels.map(label => (
                        <button
                            key={label.id}
                            onClick={() => setLabelFilter(label.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${labelFilter === label.id
                                ? 'text-white shadow-lg'
                                : 'bg-bg-surface border-overlay/10 text-text-muted hover:text-text-secondary'
                                }`}
                            style={labelFilter === label.id ? { backgroundColor: label.kleur || '#64748B', borderColor: label.kleur || '#64748B' } : undefined}
                        >
                            <Tag size={12} className="inline mr-1" />{label.naam}
                        </button>
                    ))}
                </div>
            )}

            {/* Weergave-schakelaar + telling */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-text-muted text-sm">{gefilterd.length} item{gefilterd.length !== 1 ? 's' : ''}</p>
                <WeergaveToggle weergave={weergave} onChange={setWeergave} />
            </div>

            {loading ? (
                <LaadIndicator />
            ) : gefilterd.length === 0 ? (
                <div className="card p-8 text-center">
                    <Package size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Geen items gevonden</p>
                </div>
            ) : weergave === 'tabel' ? (
                <MateriaalTabel items={gefilterd} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                    {gefilterd.map(item => {
                        const openMeldingen = item.onderhoudsmeldingen?.filter(m => m.status !== 'afgerond') || []
                        return (
                            <Link
                                key={item.id}
                                to={`/item/${item.qr_code}`}
                                className="card flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors"
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
                                    <div className="mt-1">
                                        <BeschikbaarheidIndicator materiaalId={item.id} aantalDagen={7} compact />
                                    </div>
                                </div>
                                <StatusBadge status={item.status} />
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ── Tabelweergave ────────────────────────────────────────────────
// Compacte rijen i.p.v. tegels: meer items op één scherm. Kolommen vouwen
// progressief weg op smallere schermen (locatie → labels → beschikbaarheid),
// waarbij type + locatie dan als subregel onder de naam verschijnen.

function MateriaalTabel({ items }) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-overlay/10 text-left text-[11px] uppercase tracking-wider text-text-muted">
                            <th className="font-semibold px-4 py-2.5">Item</th>
                            <th className="font-semibold px-4 py-2.5">Status</th>
                            <th className="font-semibold px-4 py-2.5 hidden sm:table-cell">Locatie / gebruiker</th>
                            <th className="font-semibold px-4 py-2.5 hidden md:table-cell">Labels</th>
                            <th className="font-semibold px-4 py-2.5 hidden lg:table-cell">Beschikbaar (7 dg)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => <MateriaalRij key={item.id} item={item} />)}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function MateriaalRij({ item }) {
    const navigate = useNavigate()
    const openMeldingen = item.onderhoudsmeldingen?.filter(m => m.status !== 'afgerond') || []
    const locatie = item.status === 'in_gebruik'
        ? (item.huidige_medewerker?.naam || 'onbekend')
        : (item.huidige_locatie || item.standaard_locatie || '—')
    const ga = () => navigate(`/item/${item.qr_code}`)

    return (
        <tr
            role="link"
            tabIndex={0}
            aria-label={`${item.naam} — details`}
            onClick={ga}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ga() } }}
            className="border-b border-overlay/10 last:border-0 cursor-pointer hover:bg-bg-hover transition-colors focus:outline-none focus:bg-bg-hover"
        >
            {/* Item */}
            <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-text-primary truncate">{item.naam}</span>
                            {openMeldingen.length > 0 && (
                                <AlertTriangle size={13} className="text-error flex-shrink-0" />
                            )}
                        </div>
                        <p className="text-xs text-text-muted">{item.type}</p>
                        {/* Subregel op mobiel: locatie/gebruiker die daar geen eigen kolom heeft */}
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1 sm:hidden">
                            {item.status === 'in_gebruik' ? <User size={11} /> : <MapPin size={11} />}
                            <span className="truncate">{locatie}</span>
                        </p>
                    </div>
                </div>
            </td>
            {/* Status */}
            <td className="px-4 py-2.5"><StatusBadge status={item.status} /></td>
            {/* Locatie / gebruiker */}
            <td className="px-4 py-2.5 hidden sm:table-cell">
                <span className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                    {item.status === 'in_gebruik'
                        ? <User size={13} className="text-text-muted" />
                        : <MapPin size={13} className="text-text-muted" />}
                    {locatie}
                </span>
            </td>
            {/* Labels */}
            <td className="px-4 py-2.5 hidden md:table-cell">
                {item.labels?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {item.labels.map(label => (
                            <span
                                key={label.id}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                                style={{ backgroundColor: label.kleur || '#64748B' }}
                            >
                                {label.naam}
                            </span>
                        ))}
                    </div>
                ) : <span className="text-text-muted">—</span>}
            </td>
            {/* Beschikbaarheid */}
            <td className="px-4 py-2.5 hidden lg:table-cell">
                <BeschikbaarheidIndicator materiaalId={item.id} aantalDagen={7} compact />
            </td>
        </tr>
    )
}
