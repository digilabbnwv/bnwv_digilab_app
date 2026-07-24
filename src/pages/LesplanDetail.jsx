import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLesplan, addLesplan, updateLesplan, verwijderLesplan, getAllDoelgroepen, getAllKerndoelen } from '../lib/lesplannen'
import { getAllLabels } from '../lib/labels'
import { getAllMateriaal } from '../lib/materiaal'
import { getAlleWorkshopTemplates } from '../lib/workshops'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import { ArrowLeft, Save, Trash2, GraduationCap, Tag, Users, Package, Target, BookOpen, ExternalLink } from 'lucide-react'

function CheckboxLijst({ items, geselecteerd, onToggle, render, leeg }) {
    if (items.length === 0) return <p className="text-text-muted text-sm italic">{leeg}</p>
    return (
        <div className="border border-overlay/15 rounded-xl overflow-hidden">
            <div className="max-h-52 overflow-y-auto divide-y divide-overlay/10">
                {items.map(item => {
                    const actief = geselecteerd.includes(item.id)
                    return (
                        <label
                            key={item.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${actief ? 'bg-primary/10' : 'hover:bg-bg-hover'}`}
                        >
                            <input
                                type="checkbox"
                                checked={actief}
                                onChange={() => onToggle(item.id)}
                                className="w-4 h-4 accent-primary flex-shrink-0"
                            />
                            <span className={`text-sm flex-1 ${actief ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                                {render(item)}
                            </span>
                        </label>
                    )
                })}
            </div>
        </div>
    )
}

export default function LesplanDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { medewerker, isBeheerder } = useAuth()
    const isNieuw = !id

    const [loading, setLoading] = useState(!isNieuw)
    const [saving, setSaving] = useState(false)
    const [bewerkModus, setBewerkModus] = useState(isNieuw)

    const [alleDoelgroepen, setAlleDoelgroepen] = useState([])
    const [alleLabels, setAlleLabels] = useState([])
    const [alleKerndoelen, setAlleKerndoelen] = useState([])
    const [alleWorkshops, setAlleWorkshops] = useState([])
    const [alleMateriaal, setAlleMateriaal] = useState([])

    const [gekoppeld, setGekoppeld] = useState({ doelgroepen: [], labels: [], kerndoelen: [], workshops: [], materiaal: [] }) // voor leesmodus

    const [form, setForm] = useState({
        titel: '', omschrijving: '', bestand_url: '',
        doelgroep_ids: [], label_ids: [], kerndoel_ids: [], workshop_template_ids: [], materiaal_ids: [],
    })

    useEffect(() => {
        Promise.all([getAllDoelgroepen(), getAllLabels(), getAllKerndoelen(), getAlleWorkshopTemplates(), getAllMateriaal()])
            .then(([dg, lb, kd, ws, mat]) => {
                setAlleDoelgroepen(dg || [])
                setAlleLabels(lb || [])
                setAlleKerndoelen(kd || [])
                setAlleWorkshops(ws || [])
                setAlleMateriaal(mat || [])
            })
            .catch(console.error)
    }, [])

    useEffect(() => {
        if (!id) return
        getLesplan(id)
            .then(l => {
                if (l) {
                    setForm({
                        titel: l.titel || '',
                        omschrijving: l.omschrijving || '',
                        bestand_url: l.bestand_url || '',
                        doelgroep_ids: (l.doelgroepen || []).map(d => d.id),
                        label_ids: (l.labels || []).map(x => x.id),
                        kerndoel_ids: (l.kerndoelen || []).map(k => k.id),
                        workshop_template_ids: (l.workshops || []).map(w => w.id),
                        materiaal_ids: (l.materiaal || []).map(m => m.id),
                    })
                    setGekoppeld({
                        doelgroepen: l.doelgroepen || [], labels: l.labels || [], kerndoelen: l.kerndoelen || [],
                        workshops: l.workshops || [], materiaal: l.materiaal || [],
                    })
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [id])

    const update = (veld, waarde) => setForm(f => ({ ...f, [veld]: waarde }))
    const toggleIn = (veld) => (waarde) => setForm(f => ({
        ...f,
        [veld]: f[veld].includes(waarde) ? f[veld].filter(x => x !== waarde) : [...f[veld], waarde],
    }))

    const kerndoelenGegroepeerd = useMemo(() => {
        const groepen = new Map()
        alleKerndoelen.forEach(k => {
            const sleutel = `${k.vakgebied} — ${k.domein || ''} (${k.sector})`
            if (!groepen.has(sleutel)) groepen.set(sleutel, [])
            groepen.get(sleutel).push(k)
        })
        return [...groepen.entries()]
    }, [alleKerndoelen])

    async function handleOpslaan(e) {
        e.preventDefault()
        if (!form.titel.trim()) return
        setSaving(true)
        try {
            const payload = { ...form, aangemaakt_door: medewerker.id }
            if (isNieuw) {
                const nieuw = await addLesplan(payload)
                navigate(`/lesplannen/${nieuw.id}`)
            } else {
                await updateLesplan(id, payload)
                navigate('/lesplannen')
            }
        } catch (err) {
            console.error(err)
            alert('Fout bij opslaan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleVerwijder() {
        if (!confirm('Weet je zeker dat je dit lesplan wilt verwijderen?')) return
        try {
            await verwijderLesplan(id)
            navigate('/lesplannen')
        } catch (err) {
            alert('Fout bij verwijderen: ' + err.message)
        }
    }

    if (loading) return <div className="app-container pt-8"><LaadIndicator /></div>

    const leesAlleen = !bewerkModus && !isNieuw

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/lesplannen')} className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm">
                    <ArrowLeft size={16} /> Terug naar overzicht
                </button>
                {!isNieuw && isBeheerder && leesAlleen && (
                    <button onClick={() => setBewerkModus(true)} className="btn-accent py-1.5 px-4 text-sm">
                        Bewerken
                    </button>
                )}
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-6">
                {isNieuw ? 'Nieuw lesplan' : leesAlleen ? form.titel : 'Lesplan bewerken'}
            </h1>

            {/* ── Leesmodus ─────────────────────────────────── */}
            {leesAlleen ? (
                <div className="space-y-4">
                    <div className="card p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <GraduationCap size={24} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-text-primary">{form.titel}</h2>
                                {gekoppeld.doelgroepen.length > 0 && (
                                    <p className="text-sm text-text-muted">{gekoppeld.doelgroepen.map(d => d.naam).join(', ')}</p>
                                )}
                            </div>
                        </div>

                        {form.omschrijving && (
                            <p className="text-sm text-text-secondary mb-4">{form.omschrijving}</p>
                        )}

                        {form.bestand_url && /^https?:\/\//i.test(form.bestand_url) && (
                            <a href={form.bestand_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4">
                                <ExternalLink size={14} /> Document openen
                            </a>
                        )}

                        {gekoppeld.labels.length > 0 && (
                            <div className="border-t border-overlay/10 pt-4 mb-4">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Tag size={13} /> Thema
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {gekoppeld.labels.map(l => (
                                        <span key={l.id} className="text-[11px] font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: l.kleur || '#64748B' }}>
                                            {l.naam}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {gekoppeld.kerndoelen.length > 0 && (
                            <div className="border-t border-overlay/10 pt-4 mb-4">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Target size={13} /> Kerndoelen
                                </p>
                                <ul className="space-y-1">
                                    {gekoppeld.kerndoelen.map(k => (
                                        <li key={k.id} className="text-sm text-text-secondary">
                                            <span className="text-xs text-text-muted">{k.vakgebied} · {k.code}</span> — {k.omschrijving}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {gekoppeld.workshops.length > 0 && (
                            <div className="border-t border-overlay/10 pt-4 mb-4">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <BookOpen size={13} /> Workshops
                                </p>
                                <ul className="space-y-1">
                                    {gekoppeld.workshops.map(w => (
                                        <li key={w.id} className="flex items-center gap-2 text-sm text-text-secondary">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" /> {w.titel}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {gekoppeld.materiaal.length > 0 && (
                            <div className="border-t border-overlay/10 pt-4">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Package size={13} /> Materiaal
                                </p>
                                <ul className="space-y-1">
                                    {gekoppeld.materiaal.map(m => (
                                        <li key={m.id} className="flex items-center gap-2 text-sm text-text-secondary">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" /> {m.naam}
                                            <span className="text-xs text-text-muted">({m.type})</span>
                                        </li>
                                    ))}
                                </ul>
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
                            <label className="label">Omschrijving</label>
                            <textarea className="input min-h-[80px]" value={form.omschrijving} onChange={e => update('omschrijving', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Link naar document</label>
                            <input className="input" type="url" value={form.bestand_url} onChange={e => update('bestand_url', e.target.value)} placeholder="https://..." />
                        </div>

                        <div>
                            <label className="label flex items-center gap-1.5"><Users size={13} /> Doelgroep</label>
                            <CheckboxLijst
                                items={alleDoelgroepen}
                                geselecteerd={form.doelgroep_ids}
                                onToggle={toggleIn('doelgroep_ids')}
                                render={d => d.naam}
                                leeg="Geen doelgroepen beschikbaar"
                            />
                        </div>

                        <div>
                            <label className="label flex items-center gap-1.5"><Tag size={13} /> Thema (labels)</label>
                            <CheckboxLijst
                                items={alleLabels}
                                geselecteerd={form.label_ids}
                                onToggle={toggleIn('label_ids')}
                                render={l => l.naam}
                                leeg="Nog geen labels aangemaakt"
                            />
                        </div>

                        <div>
                            <label className="label flex items-center gap-1.5"><Target size={13} /> Kerndoelen</label>
                            {kerndoelenGegroepeerd.length === 0 ? (
                                <p className="text-text-muted text-sm italic">Geen kerndoelen beschikbaar</p>
                            ) : (
                                <div className="border border-overlay/15 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                                    {kerndoelenGegroepeerd.map(([groep, kerndoelen]) => (
                                        <div key={groep} className="border-b border-overlay/10 last:border-b-0">
                                            <p className="text-xs font-semibold text-text-muted px-4 py-2 bg-overlay/5">{groep}</p>
                                            {kerndoelen.map(k => {
                                                const actief = form.kerndoel_ids.includes(k.id)
                                                return (
                                                    <label key={k.id} className={`flex items-start gap-3 px-4 py-2 cursor-pointer transition-colors ${actief ? 'bg-primary/10' : 'hover:bg-bg-hover'}`}>
                                                        <input type="checkbox" checked={actief} onChange={() => toggleIn('kerndoel_ids')(k.id)} className="w-4 h-4 accent-primary flex-shrink-0 mt-0.5" />
                                                        <span className={`text-sm ${actief ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                                                            <span className="text-xs text-text-muted">{k.code}</span> — {k.omschrijving}
                                                        </span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="label flex items-center gap-1.5"><BookOpen size={13} /> Gekoppelde workshops</label>
                            <CheckboxLijst
                                items={alleWorkshops}
                                geselecteerd={form.workshop_template_ids}
                                onToggle={toggleIn('workshop_template_ids')}
                                render={w => w.titel}
                                leeg="Nog geen workshops aangemaakt"
                            />
                        </div>

                        <div>
                            <label className="label flex items-center gap-1.5"><Package size={13} /> Gekoppeld materiaal</label>
                            <CheckboxLijst
                                items={alleMateriaal}
                                geselecteerd={form.materiaal_ids}
                                onToggle={toggleIn('materiaal_ids')}
                                render={m => `${m.naam} (${m.type})`}
                                leeg="Materiaal laden..."
                            />
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
