import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAlleWorkshopTemplates } from '../lib/workshops'
import { maakGeplandeWorkshop } from '../lib/geplandeWorkshops'
import { genereerPlanning } from '../lib/planningGenerator'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import { ArrowLeft, Wand2, CalendarDays, MapPin, Clock, ChevronRight, Save, RefreshCw, Trash2 } from 'lucide-react'


export default function PlanningGenereren() {
    const navigate = useNavigate()
    const { medewerker } = useAuth()
    const [stap, setStap] = useState(1) // 1: periode, 2: preview, 3: opslaan
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const huidigeJaar = new Date().getFullYear()
    const [form, setForm] = useState({
        startDatum: `${huidigeJaar}-01-01`,
        eindDatum: `${huidigeJaar}-12-31`,
    })

    const [gegenereerd, setGegenereerd] = useState([]) // concept workshops
    const [verwijderd, setVerwijderd] = useState(new Set()) // indices verwijderd in preview

    useEffect(() => {
        getAlleWorkshopTemplates()
            .then(setTemplates)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    function handleGenereer(e) {
        e.preventDefault()
        const planning = genereerPlanning(form.startDatum, form.eindDatum, templates, medewerker.id)
        setGegenereerd(planning)
        setVerwijderd(new Set())
        setStap(2)
    }

    function toggleVerwijder(idx) {
        setVerwijderd(prev => {
            const nieuw = new Set(prev)
            if (nieuw.has(idx)) nieuw.delete(idx)
            else nieuw.add(idx)
            return nieuw
        })
    }

    async function handleOpslaan() {
        const teOpslaan = gegenereerd.filter((_, idx) => !verwijderd.has(idx))
        setSaving(true)
        try {
            for (const workshop of teOpslaan) {
                await maakGeplandeWorkshop(workshop)
            }
            setStap(3)
        } catch (err) {
            alert('Fout bij opslaan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const zichtbaar = gegenereerd.filter((_, idx) => !verwijderd.has(idx))
    const ermoloCount = zichtbaar.filter(w => w.locatie === 'Ermelo').length
    const nunspeetCount = zichtbaar.filter(w => w.locatie === 'Nunspeet').length

    if (loading) return <div className="app-container pt-8"><LaadIndicator /></div>

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button onClick={() => stap > 1 ? setStap(s => s - 1) : navigate('/kalender')} className="flex items-center gap-1 text-text-muted hover:text-text-primary mb-4 text-sm">
                <ArrowLeft size={16} /> {stap > 1 ? 'Terug' : 'Terug naar kalender'}
            </button>

            {/* Header + stappen-indicator */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wand2 size={24} className="text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Planning genereren</h1>
                    <div className="flex items-center gap-2 mt-1">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center gap-1">
                                <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${stap >= s ? 'bg-primary text-white' : 'bg-bg-surface text-text-muted border border-overlay/20'}`}>
                                    {s}
                                </div>
                                {s < 3 && <ChevronRight size={12} className="text-text-muted" />}
                            </div>
                        ))}
                        <span className="text-xs text-text-muted ml-1">
                            {stap === 1 ? 'Periode kiezen' : stap === 2 ? 'Preview & aanpassen' : 'Klaar'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Stap 1: Periode kiezen ── */}
            {stap === 1 && (
                <form onSubmit={handleGenereer} className="space-y-4">
                    <div className="card p-5 space-y-4">
                        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Periode</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label">Van</label>
                                <input
                                    className="input"
                                    type="date"
                                    value={form.startDatum}
                                    onChange={e => setForm(f => ({ ...f, startDatum: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Tot en met</label>
                                <input
                                    className="input"
                                    type="date"
                                    value={form.eindDatum}
                                    onChange={e => setForm(f => ({ ...f, eindDatum: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        {/* Uitleg regels */}
                        <div className="bg-bg-app rounded-xl p-4 space-y-2 text-xs text-text-muted">
                            <p className="font-semibold text-text-secondary mb-2">Automatische regels</p>
                            <p>📅 Woensdag → Nunspeet, 15:30–16:30</p>
                            <p>📅 Donderdag → Ermelo, 15:30–16:30</p>
                            <p>🎨 Laatste vrijdag v/d maand → AI VibeLab Ermelo, 13:00–14:30</p>
                            <p>🏖️ Kerst- en zomervakantie → geen workshops</p>
                            <p>🌷 Andere vakanties → Open Digilab</p>
                            <p>🚫 Week vóór kerst/zomer → geen workshops</p>
                            <p>🎉 Feestdagen → geen workshops</p>
                            <p>⚠️ Materiaalconflict: zelfde set niet op wo én do in 1 week</p>
                            <p>⚖️ Gelijke verdeling over Ermelo én Nunspeet</p>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary py-3 px-6 flex items-center gap-2 w-full justify-center">
                        <Wand2 size={16} /> Planning genereren
                    </button>
                </form>
            )}

            {/* ── Stap 2: Preview & aanpassen ── */}
            {stap === 2 && (
                <div className="space-y-4">
                    {/* Statistieken */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="card p-3 text-center">
                            <p className="text-2xl font-bold text-primary">{zichtbaar.length}</p>
                            <p className="text-xs text-text-muted">Totaal</p>
                        </div>
                        <div className="card p-3 text-center">
                            <p className="text-2xl font-bold text-accent">{ermoloCount}</p>
                            <p className="text-xs text-text-muted">Ermelo</p>
                        </div>
                        <div className="card p-3 text-center">
                            <p className="text-2xl font-bold text-accent">{nunspeetCount}</p>
                            <p className="text-xs text-text-muted">Nunspeet</p>
                        </div>
                    </div>

                    <p className="text-xs text-text-muted text-center">
                        Tik op <Trash2 size={10} className="inline" /> om een workshop uit de planning te verwijderen vóór het opslaan.
                    </p>

                    {/* Lijst */}
                    <div className="space-y-2">
                        {gegenereerd.map((workshop, idx) => {
                            const isVerwijderd = verwijderd.has(idx)
                            const datumObj = new Date(workshop.datum + 'T00:00:00')
                            return (
                                <div
                                    key={idx}
                                    className={`card flex items-center gap-3 p-3 transition-all ${isVerwijderd ? 'opacity-30 line-through' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                                        <span className="text-xs text-primary font-medium">
                                            {datumObj.toLocaleDateString('nl-NL', { month: 'short' })}
                                        </span>
                                        <span className="text-base font-bold text-primary leading-tight">
                                            {datumObj.getDate()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary truncate">{workshop.titel}</p>
                                        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                                            <span className="flex items-center gap-0.5">
                                                <Clock size={10} /> {workshop.start_tijd}–{workshop.eind_tijd}
                                            </span>
                                            <span className="flex items-center gap-0.5">
                                                <MapPin size={10} /> {workshop.locatie}
                                            </span>
                                        </div>
                                        {workshop.opmerkingen && (
                                            <p className="text-xs text-amber-400 mt-0.5 italic">{workshop.opmerkingen}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => toggleVerwijder(idx)}
                                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isVerwijderd ? 'text-success hover:bg-success/10' : 'text-error hover:bg-error/10'}`}
                                        title={isVerwijderd ? 'Terugzetten' : 'Verwijderen'}
                                    >
                                        {isVerwijderd ? <RefreshCw size={14} /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    <button
                        onClick={handleOpslaan}
                        disabled={saving || zichtbaar.length === 0}
                        className="btn-primary py-3 px-6 flex items-center gap-2 w-full justify-center"
                    >
                        <Save size={16} />
                        {saving ? 'Opslaan...' : `${zichtbaar.length} workshops opslaan als concept`}
                    </button>
                </div>
            )}

            {/* ── Stap 3: Klaar ── */}
            {stap === 3 && (
                <div className="card p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                        <CalendarDays size={32} className="text-success" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">Planning opgeslagen!</h2>
                    <p className="text-text-muted text-sm mb-6">
                        {zichtbaar.length} concept-workshops staan klaar in de kalender.
                        Je kunt ze daar per stuk bewerken en publiceren.
                    </p>
                    <button onClick={() => navigate('/kalender')} className="btn-primary py-3 px-6 w-full">
                        Naar kalender
                    </button>
                </div>
            )}
        </div>
    )
}
