import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAlleGeplandeWorkshops } from '../lib/geplandeWorkshops'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import { Search, CalendarDays, Plus, MapPin, ChevronLeft, ChevronRight, Clock, Users, List, Grid3X3 } from 'lucide-react'

const LOCATIES = ['Ermelo', 'Nunspeet']
const STATUSSEN = [
    { key: 'alle', label: 'Alle' },
    { key: 'concept', label: 'Concept' },
    { key: 'gepubliceerd', label: 'Gepubliceerd' },
    { key: 'geannuleerd', label: 'Geannuleerd' },
]

function maandNaam(jaar, maand) {
    return new Date(jaar, maand).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
}

function getDagenInMaand(jaar, maand) {
    return new Date(jaar, maand + 1, 0).getDate()
}

function getEersteDagVanMaand(jaar, maand) {
    // 0=zo, 1=ma, ..., 6=za → we willen maandag=0
    const dag = new Date(jaar, maand, 1).getDay()
    return dag === 0 ? 6 : dag - 1
}

function formatDatum(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const statusKleuren = {
    concept: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    gepubliceerd: 'bg-success/20 text-success border-success/30',
    geannuleerd: 'bg-error/20 text-error border-error/30',
}

function WorkshopStatusBadge({ status }) {
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusKleuren[status] || ''}`}>
            {status === 'concept' ? 'Concept' : status === 'gepubliceerd' ? 'Gepubliceerd' : 'Geannuleerd'}
        </span>
    )
}

export default function Kalender() {
    const { isBeheerder } = useAuth()
    const [workshops, setWorkshops] = useState([])
    const [loading, setLoading] = useState(true)
    const [zoekterm, setZoekterm] = useState('')
    const [statusFilter, setStatusFilter] = useState('alle')
    const [locatieFilter, setLocatieFilter] = useState('alle')
    const [weergave, setWeergave] = useState('lijst') // 'lijst' | 'kalender'

    // Maand-navigatie voor kalenderweergave
    const nu = new Date()
    const [jaar, setJaar] = useState(nu.getFullYear())
    const [maand, setMaand] = useState(nu.getMonth())

    useEffect(() => {
        getAlleGeplandeWorkshops()
            .then(setWorkshops)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const gefilterd = useMemo(() => {
        let res = workshops
        if (zoekterm) {
            const q = zoekterm.toLowerCase()
            res = res.filter(w =>
                w.titel?.toLowerCase().includes(q) ||
                w.locatie?.toLowerCase().includes(q) ||
                w.opmerkingen?.toLowerCase().includes(q)
            )
        }
        if (statusFilter !== 'alle') {
            res = res.filter(w => w.status === statusFilter)
        }
        if (locatieFilter !== 'alle') {
            res = res.filter(w => w.locatie === locatieFilter)
        }
        return res
    }, [zoekterm, statusFilter, locatieFilter, workshops])

    // Workshops gegroepeerd per datum voor kalenderweergave
    const workshopsPerDatum = useMemo(() => {
        const map = {}
        gefilterd.forEach(w => {
            if (!map[w.datum]) map[w.datum] = []
            map[w.datum].push(w)
        })
        return map
    }, [gefilterd])

    function vorigeMaand() {
        if (maand === 0) { setMaand(11); setJaar(j => j - 1) }
        else setMaand(m => m - 1)
    }
    function volgendeMaand() {
        if (maand === 11) { setMaand(0); setJaar(j => j + 1) }
        else setMaand(m => m + 1)
    }

    // Kalender-grid
    const dagenInMaand = getDagenInMaand(jaar, maand)
    const eersteDag = getEersteDagVanMaand(jaar, maand)
    const vandaag = formatDatum(nu)

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Kalender</h1>
                <div className="flex items-center gap-2">
                    {/* Weergave toggle */}
                    <div className="flex bg-bg-surface rounded-lg border border-overlay/10 p-0.5">
                        <button
                            onClick={() => setWeergave('lijst')}
                            className={`p-1.5 rounded-md transition-colors ${weergave === 'lijst' ? 'bg-primary text-white' : 'text-text-muted'}`}
                            title="Lijstweergave"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setWeergave('kalender')}
                            className={`p-1.5 rounded-md transition-colors ${weergave === 'kalender' ? 'bg-primary text-white' : 'text-text-muted'}`}
                            title="Kalenderweergave"
                        >
                            <Grid3X3 size={16} />
                        </button>
                    </div>
                    {isBeheerder && (
                        <Link to="/kalender/inplannen" className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                            <Plus size={16} /> Inplannen
                        </Link>
                    )}
                </div>
            </div>

            {/* Zoekbalk */}
            <div className="relative mb-3">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="search"
                    className="input pl-10"
                    placeholder="Zoek op titel, locatie of opmerking..."
                    value={zoekterm}
                    onChange={e => setZoekterm(e.target.value)}
                />
            </div>

            {/* Status filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-2 scrollbar-hide">
                {STATUSSEN.map(({ key, label }) => (
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
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                <button
                    onClick={() => setLocatieFilter('alle')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${locatieFilter === 'alle'
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
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${locatieFilter === loc
                            ? 'bg-accent text-white shadow-lg shadow-accent/30'
                            : 'bg-bg-surface border border-overlay/10 text-text-muted hover:text-text-secondary'
                        }`}
                    >
                        <MapPin size={12} className="inline mr-1" />{loc}
                    </button>
                ))}
            </div>

            {loading ? (
                <LaadIndicator />
            ) : weergave === 'kalender' ? (
                /* ── Kalenderweergave ── */
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={vorigeMaand} className="p-2 hover:bg-bg-hover rounded-lg transition-colors">
                            <ChevronLeft size={20} className="text-text-muted" />
                        </button>
                        <h2 className="text-lg font-semibold text-text-primary capitalize">
                            {maandNaam(jaar, maand)}
                        </h2>
                        <button onClick={volgendeMaand} className="p-2 hover:bg-bg-hover rounded-lg transition-colors">
                            <ChevronRight size={20} className="text-text-muted" />
                        </button>
                    </div>

                    {/* Weekdagen header */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(d => (
                            <div key={d} className="text-center text-xs font-medium text-text-muted py-1">{d}</div>
                        ))}
                    </div>

                    {/* Dagen grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Lege cellen voor offset */}
                        {Array.from({ length: eersteDag }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {Array.from({ length: dagenInMaand }).map((_, i) => {
                            const dag = i + 1
                            const datumStr = `${jaar}-${String(maand + 1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`
                            const dagWorkshops = workshopsPerDatum[datumStr] || []
                            const isVandaag = datumStr === vandaag

                            return (
                                <div
                                    key={dag}
                                    className={`aspect-square rounded-lg p-0.5 text-xs flex flex-col items-center ${isVandaag ? 'ring-2 ring-primary bg-primary/10' : ''
                                    } ${dagWorkshops.length > 0 ? 'bg-bg-surface' : ''}`}
                                >
                                    <span className={`font-medium ${isVandaag ? 'text-primary' : 'text-text-secondary'}`}>
                                        {dag}
                                    </span>
                                    {dagWorkshops.length > 0 && (
                                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                                            {dagWorkshops.slice(0, 3).map(w => (
                                                <div
                                                    key={w.id}
                                                    className={`w-1.5 h-1.5 rounded-full ${w.status === 'gepubliceerd' ? 'bg-success' : w.status === 'concept' ? 'bg-amber-400' : 'bg-error'}`}
                                                    title={w.titel}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Legenda */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-overlay/10">
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <div className="w-2 h-2 rounded-full bg-success" /> Gepubliceerd
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <div className="w-2 h-2 rounded-full bg-amber-400" /> Concept
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <div className="w-2 h-2 rounded-full bg-error" /> Geannuleerd
                        </div>
                    </div>
                </div>
            ) : gefilterd.length === 0 ? (
                <div className="card p-8 text-center">
                    <CalendarDays size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Geen workshops gevonden</p>
                </div>
            ) : (
                /* ── Lijstweergave ── */
                <div className="space-y-2">
                    {gefilterd.map(workshop => (
                        <Link
                            key={workshop.id}
                            to={`/kalender/${workshop.id}`}
                            className="card flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors"
                        >
                            {/* Datum blokje */}
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                                <span className="text-xs text-primary font-medium">
                                    {new Date(workshop.datum + 'T00:00:00').toLocaleDateString('nl-NL', { month: 'short' })}
                                </span>
                                <span className="text-lg font-bold text-primary leading-tight">
                                    {new Date(workshop.datum + 'T00:00:00').getDate()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-text-primary truncate">{workshop.titel}</p>
                                    <WorkshopStatusBadge status={workshop.status} />
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                                    <span className="flex items-center gap-1">
                                        <Clock size={11} /> {workshop.start_tijd?.slice(0, 5)}–{workshop.eind_tijd?.slice(0, 5)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin size={11} /> {workshop.locatie}
                                    </span>
                                    {workshop.max_deelnemers && (
                                        <span className="flex items-center gap-1">
                                            <Users size={11} /> max {workshop.max_deelnemers}
                                        </span>
                                    )}
                                </div>
                                {workshop.opmerkingen && (
                                    <p className="text-xs text-text-muted mt-0.5 italic truncate">{workshop.opmerkingen}</p>
                                )}
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
