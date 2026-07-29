import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    getLesplan, addLesplan, updateLesplan, verwijderLesplan,
    getAllDoelgroepen, getAllKerndoelen, getAllThemas, getAllSeries, uploadLesbestand,
} from '../lib/lesplannen'
import { getAllMateriaal } from '../lib/materiaal'
import { getAlleWorkshopTemplates } from '../lib/workshops'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import RichText, { RichTekstWeergave } from '../components/RichText'
import {
    ArrowLeft, Save, Trash2, GraduationCap, Tag, Users, Package, Target, BookOpen,
    Layers, Clock, Upload, FileText, Plus, X, ListChecks, Search,
} from 'lucide-react'

const DIEPGANG = [
    { key: 'kennismaking', label: 'Kennismaking' },
    { key: 'verdieping', label: 'Verdieping' },
    { key: 'beheersing', label: 'Beheersing' },
]
const DIEPGANG_STIJL = {
    kennismaking: 'bg-primary/15 text-primary',
    verdieping: 'bg-accent/15 text-accent',
    beheersing: 'bg-success/15 text-success',
}
const SOORTEN = [
    { key: 'presentatie', label: 'Presentatie' },
    { key: 'werkblad', label: 'Werkblad' },
    { key: 'handleiding', label: 'Handleiding' },
    { key: 'overig', label: 'Overig' },
]

function Veld({ label, icon, children }) {
    const Icon = icon
    return (
        <div>
            <label className="flex items-center gap-1.5 text-text-secondary text-sm font-medium mb-1.5">
                {Icon && <Icon size={13} />} {label}
            </label>
            {children}
        </div>
    )
}

function CheckboxLijst({ items, geselecteerd, onToggle, render, leeg, zoekTekst }) {
    const [q, setQ] = useState('')
    if (items.length === 0) return <p className="text-text-muted text-sm italic">{leeg}</p>
    const tekst = zoekTekst || (i => i.naam || i.titel || '')
    const gefilterd = q.trim() ? items.filter(i => tekst(i).toLowerCase().includes(q.trim().toLowerCase())) : items
    const toonZoek = items.length > 6
    return (
        <div className="border border-overlay/15 rounded-xl overflow-hidden">
            {toonZoek && (
                <div className="relative border-b border-overlay/10">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Zoeken..."
                        className="w-full pl-8 pr-3 py-2 text-sm bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                </div>
            )}
            <div className="max-h-52 overflow-y-auto divide-y divide-overlay/10">
                {gefilterd.length === 0 ? (
                    <p className="text-text-muted text-xs italic px-3 py-3 text-center">Niets gevonden</p>
                ) : gefilterd.map(item => {
                    const actief = geselecteerd.includes(item.id)
                    return (
                        <label key={item.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${actief ? 'bg-primary/10' : 'hover:bg-bg-hover'}`}>
                            <input type="checkbox" checked={actief} onChange={() => onToggle(item.id)} className="w-4 h-4 accent-primary flex-shrink-0" />
                            <span className={`text-sm flex-1 ${actief ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{render(item)}</span>
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
    const [uploaden, setUploaden] = useState(false)
    const bestandInput = useRef(null)

    const [alleDoelgroepen, setAlleDoelgroepen] = useState([])
    const [alleThemas, setAlleThemas] = useState([])
    const [alleKerndoelen, setAlleKerndoelen] = useState([])
    const [alleSeries, setAlleSeries] = useState([])
    const [alleWorkshops, setAlleWorkshops] = useState([])
    const [alleMateriaal, setAlleMateriaal] = useState([])

    const leegForm = {
        titel: '', omschrijving: '', status: 'concept',
        lesduur_minuten: '', groepsgrootte: '',
        voorbereiding: '', benodigdheden: '',
        lesverloop_intro: '', lesverloop_kern: '', lesverloop_afsluiting: '',
        differentiatie: '', evaluatie: '', tips: '',
        leerdoelen: [],
        doelgroep_ids: [], thema_ids: [], materiaal_ids: [], workshop_template_ids: [],
        kerndoelen: [], series: [], bestanden: [],
    }
    const [form, setForm] = useState(leegForm)
    const [gekoppeld, setGekoppeld] = useState(null) // voor leesmodus
    const [kerndoelZoek, setKerndoelZoek] = useState('')

    useEffect(() => {
        Promise.all([getAllDoelgroepen(), getAllThemas(), getAllKerndoelen(), getAllSeries(), getAlleWorkshopTemplates(), getAllMateriaal()])
            .then(([dg, th, kd, se, ws, mat]) => {
                setAlleDoelgroepen(dg || [])
                setAlleThemas(th || [])
                setAlleKerndoelen(kd || [])
                setAlleSeries(se || [])
                setAlleWorkshops(ws || [])
                setAlleMateriaal(mat || [])
            })
            .catch(console.error)
    }, [])

    useEffect(() => {
        if (!id) return
        getLesplan(id)
            .then(l => {
                if (!l) return
                setGekoppeld(l)
                setForm({
                    titel: l.titel || '', omschrijving: l.omschrijving || '', status: l.status || 'concept',
                    lesduur_minuten: l.lesduur_minuten ?? '', groepsgrootte: l.groepsgrootte || '',
                    voorbereiding: l.voorbereiding || '', benodigdheden: l.benodigdheden || '',
                    lesverloop_intro: l.lesverloop_intro || '', lesverloop_kern: l.lesverloop_kern || '', lesverloop_afsluiting: l.lesverloop_afsluiting || '',
                    differentiatie: l.differentiatie || '', evaluatie: l.evaluatie || '', tips: l.tips || '',
                    leerdoelen: l.leerdoelen || [],
                    doelgroep_ids: (l.doelgroepen || []).map(d => d.id),
                    thema_ids: (l.themas || []).map(t => t.id),
                    materiaal_ids: (l.materiaal || []).map(m => m.id),
                    workshop_template_ids: (l.workshops || []).map(w => w.id),
                    kerndoelen: (l.kerndoelen || []).map(k => ({ kerndoel_id: k.id, diepgang: k.diepgang || 'kennismaking' })),
                    series: (l.series || []).map(s => ({ serie_id: s.id, volgorde: s.volgorde ?? 1 })),
                    bestanden: (l.bestanden || []).map(b => ({ bestand_url: b.bestand_url, bestandsnaam: b.bestandsnaam, soort: b.soort })),
                })
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [id])

    const update = (veld, waarde) => setForm(f => ({ ...f, [veld]: waarde }))
    const toggleIn = (veld) => (waarde) => setForm(f => ({
        ...f,
        [veld]: f[veld].includes(waarde) ? f[veld].filter(x => x !== waarde) : [...f[veld], waarde],
    }))

    // Kerndoelen met diepgang
    const kerndoelActief = (kid) => form.kerndoelen.some(k => k.kerndoel_id === kid)
    const toggleKerndoel = (kid) => setForm(f => ({
        ...f,
        kerndoelen: f.kerndoelen.some(k => k.kerndoel_id === kid)
            ? f.kerndoelen.filter(k => k.kerndoel_id !== kid)
            : [...f.kerndoelen, { kerndoel_id: kid, diepgang: 'kennismaking' }],
    }))
    const setDiepgang = (kid, diepgang) => setForm(f => ({
        ...f,
        kerndoelen: f.kerndoelen.map(k => k.kerndoel_id === kid ? { ...k, diepgang } : k),
    }))

    // Series met volgorde
    const serieActief = (sid) => form.series.some(s => s.serie_id === sid)
    const toggleSerie = (sid) => setForm(f => ({
        ...f,
        series: f.series.some(s => s.serie_id === sid)
            ? f.series.filter(s => s.serie_id !== sid)
            : [...f.series, { serie_id: sid, volgorde: 1 }],
    }))
    const setVolgorde = (sid, volgorde) => setForm(f => ({
        ...f,
        series: f.series.map(s => s.serie_id === sid ? { ...s, volgorde } : s),
    }))

    // Leerdoelen
    const setLeerdoel = (i, waarde) => setForm(f => ({ ...f, leerdoelen: f.leerdoelen.map((d, idx) => idx === i ? waarde : d) }))
    const voegLeerdoelToe = () => setForm(f => ({ ...f, leerdoelen: [...f.leerdoelen, ''] }))
    const verwijderLeerdoel = (i) => setForm(f => ({ ...f, leerdoelen: f.leerdoelen.filter((_, idx) => idx !== i) }))

    // Bestanden
    async function handleBestanden(e) {
        const files = [...(e.target.files || [])]
        if (!files.length) return
        setUploaden(true)
        try {
            const nieuwe = []
            for (const file of files) {
                const url = await uploadLesbestand(file, id || 'concept')
                nieuwe.push({ bestand_url: url, bestandsnaam: file.name, soort: 'werkblad' })
            }
            setForm(f => ({ ...f, bestanden: [...f.bestanden, ...nieuwe] }))
        } catch (err) {
            console.error(err)
            alert('Uploaden mislukt: ' + err.message)
        } finally {
            setUploaden(false)
            if (bestandInput.current) bestandInput.current.value = ''
        }
    }
    const setBestandSoort = (i, soort) => setForm(f => ({ ...f, bestanden: f.bestanden.map((b, idx) => idx === i ? { ...b, soort } : b) }))
    const verwijderBestand = (i) => setForm(f => ({ ...f, bestanden: f.bestanden.filter((_, idx) => idx !== i) }))

    const kerndoelenGegroepeerd = useMemo(() => {
        const q = kerndoelZoek.trim().toLowerCase()
        const bron = q
            ? alleKerndoelen.filter(k => `${k.code} ${k.omschrijving} ${k.vakgebied} ${k.domein || ''}`.toLowerCase().includes(q))
            : alleKerndoelen
        const groepen = new Map()
        bron.forEach(k => {
            const sleutel = `${k.vakgebied} — ${k.domein || ''} (${k.sector})`
            if (!groepen.has(sleutel)) groepen.set(sleutel, [])
            groepen.get(sleutel).push(k)
        })
        return [...groepen.entries()]
    }, [alleKerndoelen, kerndoelZoek])

    function bouwPayload(status) {
        return {
            ...form,
            status: status || form.status,
            lesduur_minuten: form.lesduur_minuten === '' ? null : Number(form.lesduur_minuten),
            leerdoelen: form.leerdoelen.map(d => d.trim()).filter(Boolean),
            aangemaakt_door: medewerker.id,
        }
    }

    async function opslaan(status) {
        if (!form.titel.trim()) { alert('Vul een titel in'); return }
        setSaving(true)
        try {
            const payload = bouwPayload(status)
            if (isNieuw) {
                const nieuw = await addLesplan(payload)
                navigate(`/lesplannen/${nieuw.id}`)
            } else {
                await updateLesplan(id, payload)
                setBewerkModus(false)
                const vers = await getLesplan(id)
                setGekoppeld(vers)
                setForm(f => ({ ...f, status: vers.status }))
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

    // ── LEESMODUS ────────────────────────────────────────────────
    if (leesAlleen && gekoppeld) return (
        <LesplanLezen
            l={gekoppeld}
            isBeheerder={isBeheerder}
            onBewerken={() => setBewerkModus(true)}
            onTerug={() => navigate('/lesplannen')}
        />
    )

    // ── BEWERK/NIEUW-MODUS: editor + rail ────────────────────────
    return (
        <div className="app-container lg:max-w-6xl pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-overlay/10">
                <button onClick={() => navigate('/lesplannen')} className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm">
                    <ArrowLeft size={16} /> Lesplannen
                </button>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${form.status === 'gepubliceerd' ? 'bg-success/15 text-success' : 'bg-amber-500/15 text-amber-500'}`}>
                        {form.status === 'gepubliceerd' ? 'Gepubliceerd' : 'Concept'}
                    </span>
                    <button onClick={() => opslaan('concept')} disabled={saving} className="btn-ghost py-2 px-4 text-sm">
                        Opslaan als concept
                    </button>
                    <button onClick={() => opslaan('gepubliceerd')} disabled={saving} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                        <Save size={15} /> {saving ? 'Bezig...' : 'Publiceren'}
                    </button>
                </div>
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-5">{isNieuw ? 'Nieuwe lesbrief' : 'Lesbrief bewerken'}</h1>

            <div className="lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6 lg:items-start">
                {/* ── Linkerkolom: inhoud ── */}
                <div className="space-y-4">
                    <div className="card p-5 space-y-4">
                        <Veld label="Titel *">
                            <input className="input" value={form.titel} onChange={e => update('titel', e.target.value)} placeholder="Bijv. Micro:bit — de basis" />
                        </Veld>
                        <Veld label="Lesomschrijving">
                            <RichText value={form.omschrijving} onChange={v => update('omschrijving', v)} />
                        </Veld>
                        <div className="grid grid-cols-2 gap-3">
                            <Veld label="Lesduur (min)" icon={Clock}>
                                <input type="number" min="0" className="input" value={form.lesduur_minuten} onChange={e => update('lesduur_minuten', e.target.value)} placeholder="60" />
                            </Veld>
                            <Veld label="Groepsgrootte" icon={Users}>
                                <input className="input" value={form.groepsgrootte} onChange={e => update('groepsgrootte', e.target.value)} placeholder="Hele klas" />
                            </Veld>
                        </div>
                    </div>

                    <div className="card p-5">
                        <Veld label="Leerdoelen" icon={ListChecks}>
                            <div className="space-y-2">
                                {form.leerdoelen.map((doel, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input className="input" value={doel} onChange={e => setLeerdoel(i, e.target.value)} placeholder={`Leerdoel ${i + 1}`} />
                                        <button type="button" onClick={() => verwijderLeerdoel(i)} className="p-2 text-text-muted hover:text-error flex-shrink-0" aria-label="Leerdoel verwijderen">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={voegLeerdoelToe} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-end">
                                    <Plus size={15} /> Leerdoel toevoegen
                                </button>
                            </div>
                        </Veld>
                    </div>

                    <div className="card p-5 space-y-4">
                        <p className="text-sm font-semibold text-text-primary">Lesverloop</p>
                        <Veld label="Introductie">
                            <RichText value={form.lesverloop_intro} onChange={v => update('lesverloop_intro', v)} minHeight={60} />
                        </Veld>
                        <Veld label="Kern">
                            <RichText value={form.lesverloop_kern} onChange={v => update('lesverloop_kern', v)} minHeight={60} />
                        </Veld>
                        <Veld label="Afsluiting">
                            <RichText value={form.lesverloop_afsluiting} onChange={v => update('lesverloop_afsluiting', v)} minHeight={60} />
                        </Veld>
                    </div>

                    <div className="card p-5 space-y-4">
                        <Veld label="Voorbereiding">
                            <RichText value={form.voorbereiding} onChange={v => update('voorbereiding', v)} minHeight={60} />
                        </Veld>
                        <Veld label="Benodigdheden (naast materiaal)">
                            <RichText value={form.benodigdheden} onChange={v => update('benodigdheden', v)} minHeight={60} />
                        </Veld>
                        <Veld label="Differentiatie">
                            <RichText value={form.differentiatie} onChange={v => update('differentiatie', v)} minHeight={60} />
                        </Veld>
                        <Veld label="Evaluatie / reflectie">
                            <RichText value={form.evaluatie} onChange={v => update('evaluatie', v)} minHeight={60} />
                        </Veld>
                        <Veld label="Tips voor de begeleider">
                            <RichText value={form.tips} onChange={v => update('tips', v)} minHeight={60} />
                        </Veld>
                    </div>
                </div>

                {/* ── Rechterkolom: koppelingen (rail) ── */}
                <div className="space-y-3 mt-4 lg:mt-0 lg:sticky lg:top-4">
                    <div className="card p-4">
                        <Veld label="Thema's" icon={Tag}>
                            <CheckboxLijst items={alleThemas} geselecteerd={form.thema_ids} onToggle={toggleIn('thema_ids')} render={t => t.naam} leeg="Nog geen thema's aangemaakt" />
                        </Veld>
                    </div>

                    <div className="card p-4">
                        <Veld label="Serie(s)" icon={Layers}>
                            {alleSeries.length === 0 ? (
                                <p className="text-text-muted text-sm italic">Nog geen series aangemaakt</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {alleSeries.map(s => {
                                        const actief = serieActief(s.id)
                                        const huidige = form.series.find(x => x.serie_id === s.id)
                                        return (
                                            <div key={s.id} className={`rounded-lg border px-3 py-2 ${actief ? 'border-primary/40 bg-primary/5' : 'border-overlay/15'}`}>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={actief} onChange={() => toggleSerie(s.id)} className="w-4 h-4 accent-primary" />
                                                    <span className="text-sm text-text-secondary flex-1">{s.naam}</span>
                                                    {actief && (
                                                        <span className="flex items-center gap-1 text-xs text-text-muted">
                                                            deel
                                                            <input type="number" min="1" value={huidige?.volgorde ?? 1} onChange={e => setVolgorde(s.id, Number(e.target.value))} className="w-12 px-1.5 py-0.5 rounded border border-overlay/20 bg-bg-surface text-text-primary text-center" />
                                                        </span>
                                                    )}
                                                </label>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </Veld>
                    </div>

                    <div className="card p-4">
                        <Veld label="Doelgroepen" icon={Users}>
                            <CheckboxLijst items={alleDoelgroepen} geselecteerd={form.doelgroep_ids} onToggle={toggleIn('doelgroep_ids')} render={d => d.naam} leeg="Geen doelgroepen" />
                        </Veld>
                    </div>

                    <div className="card p-4">
                        <Veld label="Kerndoelen + diepgang" icon={Target}>
                            <div className="relative mb-2">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input value={kerndoelZoek} onChange={e => setKerndoelZoek(e.target.value)} placeholder="Zoek kerndoel..." className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-overlay/15 bg-bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
                            </div>
                            {kerndoelenGegroepeerd.length === 0 ? (
                                <p className="text-text-muted text-sm italic">{kerndoelZoek ? 'Niets gevonden' : 'Geen kerndoelen beschikbaar'}</p>
                            ) : (
                                <div className="border border-overlay/15 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                                    {kerndoelenGegroepeerd.map(([groep, kerndoelen]) => (
                                        <div key={groep} className="border-b border-overlay/10 last:border-b-0">
                                            <p className="text-[11px] font-semibold text-text-muted px-3 py-1.5 bg-overlay/5">{groep}</p>
                                            {kerndoelen.map(k => {
                                                const actief = kerndoelActief(k.id)
                                                const huidige = form.kerndoelen.find(x => x.kerndoel_id === k.id)
                                                return (
                                                    <div key={k.id} className={`px-3 py-2 ${actief ? 'bg-primary/10' : ''}`}>
                                                        <label className="flex items-start gap-2 cursor-pointer">
                                                            <input type="checkbox" checked={actief} onChange={() => toggleKerndoel(k.id)} className="w-4 h-4 accent-primary flex-shrink-0 mt-0.5" />
                                                            <span className="text-sm text-text-secondary"><span className="text-xs text-text-muted">{k.code}</span> — {k.omschrijving}</span>
                                                        </label>
                                                        {actief && (
                                                            <div className="flex gap-1 mt-1.5 ml-6">
                                                                {DIEPGANG.map(d => (
                                                                    <button key={d.key} type="button" onClick={() => setDiepgang(k.id, d.key)}
                                                                        className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${huidige?.diepgang === d.key ? DIEPGANG_STIJL[d.key] : 'bg-overlay/5 text-text-muted hover:text-text-secondary'}`}>
                                                                        {d.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Veld>
                    </div>

                    <div className="card p-4">
                        <Veld label="Materiaal" icon={Package}>
                            <CheckboxLijst items={alleMateriaal} geselecteerd={form.materiaal_ids} onToggle={toggleIn('materiaal_ids')} render={m => `${m.naam} (${m.type})`} leeg="Materiaal laden..." />
                        </Veld>
                    </div>

                    <div className="card p-4">
                        <Veld label="Gekoppelde workshops" icon={BookOpen}>
                            <CheckboxLijst items={alleWorkshops} geselecteerd={form.workshop_template_ids} onToggle={toggleIn('workshop_template_ids')} render={w => w.titel} leeg="Nog geen workshops" />
                        </Veld>
                    </div>

                    <div className="card p-4">
                        <Veld label="Bestanden" icon={FileText}>
                            <div className="space-y-2">
                                {form.bestanden.map((b, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <FileText size={15} className="text-text-muted flex-shrink-0" />
                                        <span className="flex-1 min-w-0 truncate text-text-secondary">{b.bestandsnaam}</span>
                                        <select value={b.soort} onChange={e => setBestandSoort(i, e.target.value)} className="text-xs bg-bg-surface border border-overlay/20 rounded px-1.5 py-1 text-text-secondary">
                                            {SOORTEN.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                        </select>
                                        <button type="button" onClick={() => verwijderBestand(i)} className="p-1 text-text-muted hover:text-error flex-shrink-0" aria-label="Bestand verwijderen">
                                            <X size={15} />
                                        </button>
                                    </div>
                                ))}
                                <input ref={bestandInput} type="file" multiple className="hidden" onChange={handleBestanden} />
                                <button type="button" onClick={() => bestandInput.current?.click()} disabled={uploaden}
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-overlay/30 text-sm text-text-muted hover:text-text-secondary hover:border-overlay/50 transition-colors">
                                    <Upload size={15} /> {uploaden ? 'Uploaden...' : 'Bestand uploaden'}
                                </button>
                            </div>
                        </Veld>
                    </div>

                    {!isNieuw && (
                        <button type="button" onClick={handleVerwijder} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors text-sm">
                            <Trash2 size={15} /> Lesbrief verwijderen
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Leesweergave ─────────────────────────────────────────────────
function Sectie({ titel, icon, children }) {
    const Icon = icon
    return (
        <div className="border-t border-overlay/10 pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                {Icon && <Icon size={13} />} {titel}
            </p>
            {children}
        </div>
    )
}

function LesplanLezen({ l, isBeheerder, onBewerken, onTerug }) {
    const tekstSecties = [
        ['Voorbereiding', l.voorbereiding], ['Benodigdheden', l.benodigdheden],
        ['Differentiatie', l.differentiatie], ['Evaluatie / reflectie', l.evaluatie], ['Tips voor de begeleider', l.tips],
    ].filter(([, v]) => v)
    const heeftLesverloop = l.lesverloop_intro || l.lesverloop_kern || l.lesverloop_afsluiting

    return (
        <div className="app-container lg:max-w-4xl pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onTerug} className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm">
                    <ArrowLeft size={16} /> Terug naar overzicht
                </button>
                {isBeheerder && (
                    <button onClick={onBewerken} className="btn-accent py-1.5 px-4 text-sm">Bewerken</button>
                )}
            </div>

            <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={24} className="text-primary" />
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-bold text-text-primary">{l.titel}</h1>
                        {l.status === 'concept' && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">Concept</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-text-muted mt-0.5 flex-wrap">
                        {l.doelgroepen?.length > 0 && <span>{l.doelgroepen.map(d => d.naam).join(', ')}</span>}
                        {l.lesduur_minuten && <span className="flex items-center gap-1"><Clock size={12} /> {l.lesduur_minuten} min</span>}
                        {l.groepsgrootte && <span className="flex items-center gap-1"><Users size={12} /> {l.groepsgrootte}</span>}
                    </div>
                </div>
            </div>

            {l.themas?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {l.themas.map(t => (
                        <span key={t.id} className="text-[11px] font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: t.kleur || '#64748B' }}>{t.naam}</span>
                    ))}
                </div>
            )}

            <div className="lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6 lg:items-start">
                {/* Inhoud */}
                <div className="card p-5">
                    {l.omschrijving && <RichTekstWeergave html={l.omschrijving} className="text-sm leading-relaxed" />}

                    {l.leerdoelen?.length > 0 && (
                        <Sectie titel="Leerdoelen" icon={ListChecks}>
                            <ul className="space-y-1">
                                {l.leerdoelen.map((d, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" /> {d}
                                    </li>
                                ))}
                            </ul>
                        </Sectie>
                    )}

                    {heeftLesverloop && (
                        <Sectie titel="Lesverloop">
                            <div className="space-y-2 text-sm">
                                {[['Introductie', l.lesverloop_intro], ['Kern', l.lesverloop_kern], ['Afsluiting', l.lesverloop_afsluiting]].filter(([, v]) => v).map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                        <span className="min-w-[80px] text-text-muted flex-shrink-0">{k}</span>
                                        <RichTekstWeergave html={v} className="text-sm flex-1" />
                                    </div>
                                ))}
                            </div>
                        </Sectie>
                    )}

                    {tekstSecties.map(([titel, waarde]) => (
                        <Sectie key={titel} titel={titel}>
                            <RichTekstWeergave html={waarde} className="text-sm" />
                        </Sectie>
                    ))}
                </div>

                {/* Rail */}
                <div className="space-y-3 mt-4 lg:mt-0">
                    {l.series?.length > 0 && (
                        <div className="card p-4">
                            <Sectie titel="Serie" icon={Layers}>
                                {l.series.map(s => (
                                    <p key={s.id} className="text-sm text-text-secondary">{s.naam} <span className="text-text-muted">· deel {s.volgorde}</span></p>
                                ))}
                            </Sectie>
                        </div>
                    )}

                    {l.kerndoelen?.length > 0 && (
                        <div className="card p-4">
                            <Sectie titel="Kerndoelen" icon={Target}>
                                <ul className="space-y-2">
                                    {l.kerndoelen.map(k => (
                                        <li key={k.id} className="text-sm text-text-secondary">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-text-muted">{k.vakgebied} · {k.code}</span>
                                                {k.diepgang && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIEPGANG_STIJL[k.diepgang] || ''}`}>{k.diepgang}</span>}
                                            </div>
                                            {k.omschrijving}
                                        </li>
                                    ))}
                                </ul>
                            </Sectie>
                        </div>
                    )}

                    {l.materiaal?.length > 0 && (
                        <div className="card p-4">
                            <Sectie titel="Materiaal" icon={Package}>
                                <ul className="space-y-1">
                                    {l.materiaal.map(m => (
                                        <li key={m.id} className="flex items-center gap-2 text-sm text-text-secondary">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" /> {m.naam} <span className="text-xs text-text-muted">({m.type})</span>
                                        </li>
                                    ))}
                                </ul>
                            </Sectie>
                        </div>
                    )}

                    {l.workshops?.length > 0 && (
                        <div className="card p-4">
                            <Sectie titel="Workshops" icon={BookOpen}>
                                <ul className="space-y-1">
                                    {l.workshops.map(w => (
                                        <li key={w.id} className="flex items-center gap-2 text-sm text-text-secondary">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" /> {w.titel}
                                        </li>
                                    ))}
                                </ul>
                            </Sectie>
                        </div>
                    )}

                    {l.bestanden?.length > 0 && (
                        <div className="card p-4">
                            <Sectie titel="Bestanden" icon={FileText}>
                                <ul className="space-y-1.5">
                                    {l.bestanden.map((b, i) => (
                                        <li key={i}>
                                            <a href={b.bestand_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                                <FileText size={14} className="flex-shrink-0" /> {b.bestandsnaam || 'bestand'}
                                                <span className="text-[10px] text-text-muted">({b.soort})</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </Sectie>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
