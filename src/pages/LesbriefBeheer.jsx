import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getAllThemas, addThema, updateThema, verwijderThema,
    getAllSeries, addSerie, verwijderSerie,
} from '../lib/lesplannen'
import { LaadIndicator } from '../components/UI'
import { ArrowLeft, Tag, Layers, Plus, Trash2, Save } from 'lucide-react'

export default function LesbriefBeheer() {
    const navigate = useNavigate()
    const [themas, setThemas] = useState([])
    const [series, setSeries] = useState([])
    const [loading, setLoading] = useState(true)

    const [nieuwThema, setNieuwThema] = useState({ naam: '', kleur: '#E8772E' })
    const [nieuweSerie, setNieuweSerie] = useState({ naam: '', omschrijving: '' })

    async function laad() {
        setLoading(true)
        try {
            const [th, se] = await Promise.all([getAllThemas(), getAllSeries()])
            setThemas(th || [])
            setSeries(se || [])
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    useEffect(() => { laad() }, [])

    async function themaToevoegen() {
        if (!nieuwThema.naam.trim()) return
        try {
            await addThema({ naam: nieuwThema.naam.trim(), kleur: nieuwThema.kleur, volgorde: themas.length + 1 })
            setNieuwThema({ naam: '', kleur: '#E8772E' })
            await laad()
        } catch (e) { alert('Toevoegen mislukt: ' + e.message) }
    }
    async function themaOpslaan(t) {
        try { await updateThema(t.id, { naam: t.naam, kleur: t.kleur }); await laad() }
        catch (e) { alert('Opslaan mislukt: ' + e.message) }
    }
    async function themaVerwijderen(t) {
        if (!confirm(`Thema "${t.naam}" verwijderen? De koppeling met lesbrieven verdwijnt ook.`)) return
        try { await verwijderThema(t.id); await laad() } catch (e) { alert('Verwijderen mislukt: ' + e.message) }
    }

    async function serieToevoegen() {
        if (!nieuweSerie.naam.trim()) return
        try {
            await addSerie({ naam: nieuweSerie.naam.trim(), omschrijving: nieuweSerie.omschrijving.trim() || null })
            setNieuweSerie({ naam: '', omschrijving: '' })
            await laad()
        } catch (e) { alert('Toevoegen mislukt: ' + e.message) }
    }
    async function serieVerwijderen(s) {
        if (!confirm(`Serie "${s.naam}" verwijderen? De koppeling met lesbrieven verdwijnt ook.`)) return
        try { await verwijderSerie(s.id); await laad() } catch (e) { alert('Verwijderen mislukt: ' + e.message) }
    }

    return (
        <div className="app-container lg:max-w-4xl pt-8 pb-4 animate-fadeIn">
            <button onClick={() => navigate('/lesplannen')} className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm mb-4">
                <ArrowLeft size={16} /> Terug naar lesplannen
            </button>
            <h1 className="text-2xl font-bold text-text-primary mb-6">Thema's & series beheren</h1>

            {loading ? <LaadIndicator /> : (
                <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-6 lg:space-y-0">
                    {/* Thema's */}
                    <div className="card p-5">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-4"><Tag size={18} className="text-primary" /> Thema's</h2>
                        <div className="space-y-2 mb-4">
                            {themas.length === 0 && <p className="text-text-muted text-sm italic">Nog geen thema's.</p>}
                            {themas.map((t, i) => (
                                <div key={t.id} className="flex items-center gap-2">
                                    <input type="color" value={t.kleur || '#64748B'} onChange={e => setThemas(arr => arr.map((x, j) => j === i ? { ...x, kleur: e.target.value } : x))} className="w-8 h-8 rounded cursor-pointer bg-transparent border border-overlay/20 flex-shrink-0" />
                                    <input value={t.naam} onChange={e => setThemas(arr => arr.map((x, j) => j === i ? { ...x, naam: e.target.value } : x))} className="input py-2 flex-1" />
                                    <button onClick={() => themaOpslaan(t)} className="p-2 text-text-muted hover:text-primary flex-shrink-0" title="Opslaan"><Save size={16} /></button>
                                    <button onClick={() => themaVerwijderen(t)} className="p-2 text-text-muted hover:text-error flex-shrink-0" title="Verwijderen"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 border-t border-overlay/10 pt-4">
                            <input type="color" value={nieuwThema.kleur} onChange={e => setNieuwThema(v => ({ ...v, kleur: e.target.value }))} className="w-8 h-8 rounded cursor-pointer bg-transparent border border-overlay/20 flex-shrink-0" />
                            <input value={nieuwThema.naam} onChange={e => setNieuwThema(v => ({ ...v, naam: e.target.value }))} placeholder="Nieuw thema" className="input py-2 flex-1" onKeyDown={e => e.key === 'Enter' && themaToevoegen()} />
                            <button onClick={themaToevoegen} className="btn-primary py-2 px-3 text-sm flex items-center gap-1 flex-shrink-0"><Plus size={15} /></button>
                        </div>
                    </div>

                    {/* Series */}
                    <div className="card p-5">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-4"><Layers size={18} className="text-primary" /> Lessenseries</h2>
                        <div className="space-y-2 mb-4">
                            {series.length === 0 && <p className="text-text-muted text-sm italic">Nog geen series.</p>}
                            {series.map(s => (
                                <div key={s.id} className="flex items-start gap-2 rounded-lg border border-overlay/10 px-3 py-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary">{s.naam}</p>
                                        {s.omschrijving && <p className="text-xs text-text-muted">{s.omschrijving}</p>}
                                    </div>
                                    <button onClick={() => serieVerwijderen(s)} className="p-1 text-text-muted hover:text-error flex-shrink-0" title="Verwijderen"><Trash2 size={15} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-overlay/10 pt-4 space-y-2">
                            <input value={nieuweSerie.naam} onChange={e => setNieuweSerie(v => ({ ...v, naam: e.target.value }))} placeholder="Naam van de serie" className="input py-2" />
                            <input value={nieuweSerie.omschrijving} onChange={e => setNieuweSerie(v => ({ ...v, omschrijving: e.target.value }))} placeholder="Korte omschrijving (optioneel)" className="input py-2" />
                            <button onClick={serieToevoegen} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5"><Plus size={15} /> Serie toevoegen</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
