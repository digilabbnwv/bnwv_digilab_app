import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getWorkshopTemplate, maakWorkshopTemplate, updateWorkshopTemplate, verwijderWorkshopTemplate, DOELGROEPEN } from '../lib/workshops'
import { getAllMateriaal } from '../lib/materiaal'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import { ArrowLeft, Save, Trash2, BookOpen, Package } from 'lucide-react'

export default function WorkshopTemplateDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { medewerker, isBeheerder } = useAuth()
    const isNieuw = !id

    const [loading, setLoading] = useState(!isNieuw)
    const [saving, setSaving] = useState(false)
    const [bewerkModus, setBewerkModus] = useState(isNieuw)
    const [allMateriaal, setAllMateriaal] = useState([])
    const [gekoppeldMateriaal, setGekoppeldMateriaal] = useState([]) // voor leesmodus
    const [form, setForm] = useState({
        titel: '',
        toelichting: '',
        materiaal_ids: [],
        materiaal_omschrijving: '',
        min_deelnemers: 1,
        max_deelnemers: 10,
        doelgroep: '',
        standaard_kosten: '',
        standaard_duur_minuten: 60,
        webshop_url: '',
        toelichting_url: '',
    })

    // Laad alle materiaal voor de selector
    useEffect(() => {
        getAllMateriaal()
            .then(items => setAllMateriaal(items || []))
            .catch(console.error)
    }, [])

    // Laad template
    useEffect(() => {
        if (!id) return
        getWorkshopTemplate(id)
            .then(t => {
                if (t) {
                    setForm({
                        titel: t.titel || '',
                        toelichting: t.toelichting || '',
                        materiaal_ids: t.materiaal_ids || [],
                        materiaal_omschrijving: t.materiaal_omschrijving || '',
                        min_deelnemers: t.min_deelnemers || 1,
                        max_deelnemers: t.max_deelnemers || 10,
                        doelgroep: t.doelgroep || '',
                        standaard_kosten: t.standaard_kosten ?? '',
                        standaard_duur_minuten: t.standaard_duur_minuten || 60,
                        webshop_url: t.webshop_url || '',
                        toelichting_url: t.toelichting_url || '',
                    })
                    setGekoppeldMateriaal(t.gekoppeld_materiaal || [])
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [id])

    const update = (veld, waarde) => setForm(f => ({ ...f, [veld]: waarde }))

    const toggleMateriaal = (materiaalId) => {
        setForm(f => ({
            ...f,
            materiaal_ids: f.materiaal_ids.includes(materiaalId)
                ? f.materiaal_ids.filter(mid => mid !== materiaalId)
                : [...f.materiaal_ids, materiaalId],
        }))
    }

    async function handleOpslaan(e) {
        e.preventDefault()
        if (!form.titel.trim()) return
        setSaving(true)
        try {
            const payload = {
                ...form,
                standaard_kosten: form.standaard_kosten === '' ? null : parseFloat(form.standaard_kosten),
                min_deelnemers: parseInt(form.min_deelnemers) || 1,
                max_deelnemers: parseInt(form.max_deelnemers) || 10,
                standaard_duur_minuten: parseInt(form.standaard_duur_minuten) || 60,
                aangemaakt_door: medewerker.id,
            }
            if (isNieuw) {
                await maakWorkshopTemplate(payload)
            } else {
                await updateWorkshopTemplate(id, payload)
            }
            navigate('/workshops')
        } catch (err) {
            console.error(err)
            alert('Fout bij opslaan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleVerwijder() {
        if (!confirm('Weet je zeker dat je deze workshop wilt verwijderen?')) return
        try {
            await verwijderWorkshopTemplate(id)
            navigate('/workshops')
        } catch (err) {
            alert('Fout bij verwijderen: ' + err.message)
        }
    }

    if (loading) return <div className="app-container pt-8"><LaadIndicator /></div>

    const leesAlleen = !bewerkModus && !isNieuw

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/workshops')} className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm">
                    <ArrowLeft size={16} /> Terug naar overzicht
                </button>
                {!isNieuw && isBeheerder && leesAlleen && (
                    <button onClick={() => setBewerkModus(true)} className="btn-accent py-1.5 px-4 text-sm">
                        Bewerken
                    </button>
                )}
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-6">
                {isNieuw ? 'Nieuwe workshop' : leesAlleen ? form.titel : 'Workshop bewerken'}
            </h1>

            {/* ── Leesmodus ─────────────────────────────────── */}
            {leesAlleen ? (
                <div className="space-y-4">
                    <div className="card p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <BookOpen size={24} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-text-primary">{form.titel}</h2>
                                {form.doelgroep && <p className="text-sm text-text-muted">{form.doelgroep}</p>}
                            </div>
                        </div>

                        {form.toelichting && (
                            <p className="text-sm text-text-secondary mb-4">{form.toelichting}</p>
                        )}

                        {/* Gekoppeld materiaal */}
                        {(gekoppeldMateriaal.length > 0 || form.materiaal_omschrijving) && (
                            <div className="border-t border-overlay/10 pt-4 mb-4">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Package size={13} /> Materiaal
                                </p>
                                {gekoppeldMateriaal.length > 0 && (
                                    <ul className="space-y-1 mb-2">
                                        {gekoppeldMateriaal.map(m => (
                                            <li key={m.id} className="flex items-center gap-2 text-sm text-text-secondary">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                                {m.naam}
                                                <span className="text-xs text-text-muted">({m.type})</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {form.materiaal_omschrijving && (
                                    <p className="text-xs text-text-muted">
                                        <span className="font-medium">Aanvullend: </span>
                                        {form.materiaal_omschrijving}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-bg-app rounded-lg p-3">
                                <p className="text-text-muted text-xs mb-1">Duur</p>
                                <p className="text-text-primary">{form.standaard_duur_minuten} minuten</p>
                            </div>
                            <div className="bg-bg-app rounded-lg p-3">
                                <p className="text-text-muted text-xs mb-1">Deelnemers</p>
                                <p className="text-text-primary">{form.min_deelnemers} – {form.max_deelnemers}</p>
                            </div>
                            <div className="bg-bg-app rounded-lg p-3">
                                <p className="text-text-muted text-xs mb-1">Kosten</p>
                                <p className="text-text-primary">{form.standaard_kosten ? `€ ${form.standaard_kosten}` : 'Gratis'}</p>
                            </div>
                        </div>

                        {(form.webshop_url || form.toelichting_url) && (
                            <div className="mt-4 flex gap-3">
                                {form.webshop_url && /^https?:\/\//i.test(form.webshop_url) && (
                                    <a href={form.webshop_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                        Webshop
                                    </a>
                                )}
                                {form.toelichting_url && /^https?:\/\//i.test(form.toelichting_url) && (
                                    <a href={form.toelichting_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                        Toelichting
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            ) : (
                /* ── Bewerkmodus ──────────────────────────────── */
                <form onSubmit={handleOpslaan} className="space-y-4">
                    <div className="card p-5 space-y-4">
                        <div>
                            <label className="label">Titel *</label>
                            <input className="input" value={form.titel} onChange={e => update('titel', e.target.value)} required />
                        </div>
                        <div>
                            <label className="label">Toelichting</label>
                            <textarea className="input min-h-[80px]" value={form.toelichting} onChange={e => update('toelichting', e.target.value)} />
                        </div>

                        {/* Materiaal-koppeling */}
                        <div>
                            <label className="label">Benodigd materiaal</label>
                            {allMateriaal.length === 0 ? (
                                <p className="text-text-muted text-sm italic">Materiaal laden...</p>
                            ) : (
                                <div className="border border-overlay/15 rounded-xl overflow-hidden">
                                    <div className="max-h-52 overflow-y-auto divide-y divide-overlay/10">
                                        {allMateriaal.map(item => {
                                            const geselecteerd = form.materiaal_ids.includes(item.id)
                                            return (
                                                <label
                                                    key={item.id}
                                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${geselecteerd ? 'bg-primary/10' : 'hover:bg-bg-hover'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={geselecteerd}
                                                        onChange={() => toggleMateriaal(item.id)}
                                                        className="w-4 h-4 accent-primary flex-shrink-0"
                                                    />
                                                    <span className={`text-sm flex-1 ${geselecteerd ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                                                        {item.naam}
                                                    </span>
                                                    <span className="text-xs text-text-muted">{item.type}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                    {form.materiaal_ids.length > 0 && (
                                        <div className="px-4 py-2 bg-primary/5 border-t border-overlay/10 text-xs text-primary font-medium">
                                            {form.materiaal_ids.length} item{form.materiaal_ids.length !== 1 ? 's' : ''} geselecteerd
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Aanvullend materiaal (vrij tekstveld) */}
                        <div>
                            <label className="label">Aanvullend materiaal</label>
                            <input
                                className="input"
                                value={form.materiaal_omschrijving}
                                onChange={e => update('materiaal_omschrijving', e.target.value)}
                                placeholder="bijv. extra kabels, printjes, stickers..."
                            />
                            <p className="text-xs text-text-muted mt-1">Materiaal dat niet in de lijst staat</p>
                        </div>

                        <div>
                            <label className="label">Doelgroep</label>
                            <select className="input" value={form.doelgroep} onChange={e => update('doelgroep', e.target.value)}>
                                <option value="">— Kies doelgroep —</option>
                                {DOELGROEPEN.map(dg => <option key={dg} value={dg}>{dg}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label">Min deelnemers</label>
                                <input className="input" type="number" min="1" value={form.min_deelnemers} onChange={e => update('min_deelnemers', e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Max deelnemers</label>
                                <input className="input" type="number" min="1" value={form.max_deelnemers} onChange={e => update('max_deelnemers', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label">Duur (minuten)</label>
                                <input className="input" type="number" min="15" step="15" value={form.standaard_duur_minuten} onChange={e => update('standaard_duur_minuten', e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Kosten (EUR)</label>
                                <input className="input" type="number" min="0" step="0.50" value={form.standaard_kosten} onChange={e => update('standaard_kosten', e.target.value)} placeholder="0.00" />
                            </div>
                        </div>
                        <div>
                            <label className="label">Webshop URL</label>
                            <input className="input" type="url" value={form.webshop_url} onChange={e => update('webshop_url', e.target.value)} placeholder="https://..." />
                        </div>
                        <div>
                            <label className="label">Toelichting URL</label>
                            <input className="input" type="url" value={form.toelichting_url} onChange={e => update('toelichting_url', e.target.value)} placeholder="https://..." />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="submit" disabled={saving} className="btn-primary py-3 px-6 flex items-center gap-2 flex-1">
                            <Save size={16} /> {saving ? 'Opslaan...' : 'Opslaan'}
                        </button>
                        {!isNieuw && (
                            <button type="button" onClick={handleVerwijder} className="py-3 px-4 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    )
}
