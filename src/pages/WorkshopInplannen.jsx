import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAlleWorkshopTemplates } from '../lib/workshops'
import { getAllMateriaal } from '../lib/materiaal'
import { maakGeplandeWorkshop } from '../lib/geplandeWorkshops'
import { checkConflicten } from '../lib/beschikbaarheid'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import ConflictBanner from '../components/ConflictBanner'
import { ArrowLeft, Save, BookOpen, CalendarDays, Package, Check, AlertTriangle } from 'lucide-react'

const LOCATIES = ['Ermelo', 'Nunspeet', 'Harderwijk', 'Putten', 'Elspeet']

export default function WorkshopInplannen() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { medewerker } = useAuth()
    const [templates, setTemplates] = useState([])
    const [allMateriaal, setAllMateriaal] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [materiaalConflicten, setMateriaalConflicten] = useState({}) // { [materiaalId]: { beschikbaar, conflicten } }
    const conflictTimer = useRef(null)

    const [form, setForm] = useState({
        template_id: searchParams.get('template') || '',
        datum: '',
        start_tijd: '15:30',
        eind_tijd: '16:30',
        locatie: 'Ermelo',
        doelgroep: '',
        max_deelnemers: '',
        kosten: '',
        materiaal_ids: [],
        opmerkingen: '',
    })

    useEffect(() => {
        Promise.all([
            getAlleWorkshopTemplates(),
            getAllMateriaal(),
        ]).then(([tmplData, matData]) => {
            setTemplates(tmplData)
            setAllMateriaal(matData)
            // Auto-vul als template via URL meegegeven is
            const urlTemplateId = searchParams.get('template')
            if (urlTemplateId) {
                const tmpl = tmplData.find(t => t.id === urlTemplateId)
                if (tmpl) {
                    setForm(f => ({
                        ...f,
                        doelgroep: tmpl.doelgroep || f.doelgroep,
                        max_deelnemers: tmpl.max_deelnemers || f.max_deelnemers,
                        kosten: tmpl.standaard_kosten ?? f.kosten,
                        start_tijd: tmpl.titel?.includes('VibeLab') ? '13:00' : f.start_tijd,
                        eind_tijd: tmpl.titel?.includes('VibeLab') ? '14:30' : f.eind_tijd,
                        materiaal_ids: tmpl.materiaal_ids || [],
                    }))
                }
            }
        })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Conflict check per materiaal bij wijzigen datum/materiaal_ids
    useEffect(() => {
        if (conflictTimer.current) clearTimeout(conflictTimer.current)
        if (!form.datum || form.materiaal_ids.length === 0) {
            setMateriaalConflicten({})
            return
        }
        conflictTimer.current = setTimeout(async () => {
            const resultaten = {}
            await Promise.all(form.materiaal_ids.map(async (matId) => {
                try {
                    resultaten[matId] = await checkConflicten(matId, form.datum, form.datum)
                } catch (err) {
                    console.error('Conflictcheck fout:', err)
                }
            }))
            setMateriaalConflicten(resultaten)
        }, 300)
        return () => { if (conflictTimer.current) clearTimeout(conflictTimer.current) }
    }, [form.datum, form.materiaal_ids])

    const geselecteerdeTemplate = templates.find(t => t.id === form.template_id)
    const gekoppeldMateriaal = (geselecteerdeTemplate?.materiaal_ids || [])
        .map(id => allMateriaal.find(m => m.id === id))
        .filter(Boolean)

    function selecteerTemplate(templateId) {
        const tmpl = templates.find(t => t.id === templateId)
        setForm(f => ({
            ...f,
            template_id: templateId,
            doelgroep: tmpl?.doelgroep || f.doelgroep,
            max_deelnemers: tmpl?.max_deelnemers || f.max_deelnemers,
            kosten: tmpl?.standaard_kosten ?? f.kosten,
            start_tijd: tmpl?.titel?.includes('VibeLab') ? '13:00' : f.start_tijd,
            eind_tijd: tmpl?.titel?.includes('VibeLab') ? '14:30' : f.eind_tijd,
            materiaal_ids: tmpl?.materiaal_ids || [],
        }))
    }

    function toggleMateriaal(matId) {
        setForm(f => ({
            ...f,
            materiaal_ids: f.materiaal_ids.includes(matId)
                ? f.materiaal_ids.filter(id => id !== matId)
                : [...f.materiaal_ids, matId],
        }))
    }

    const update = (veld, waarde) => setForm(f => ({ ...f, [veld]: waarde }))

    async function handleOpslaan(e) {
        e.preventDefault()
        if (!form.datum || !form.template_id) return
        setSaving(true)
        try {
            const tmpl = templates.find(t => t.id === form.template_id)
            await maakGeplandeWorkshop({
                template_id: form.template_id,
                titel: tmpl?.titel || 'Workshop',
                datum: form.datum,
                start_tijd: form.start_tijd,
                eind_tijd: form.eind_tijd,
                locatie: form.locatie,
                doelgroep: form.doelgroep || tmpl?.doelgroep || null,
                max_deelnemers: parseInt(form.max_deelnemers) || tmpl?.max_deelnemers || 10,
                kosten: form.kosten === '' ? null : parseFloat(form.kosten),
                materiaal_ids: form.materiaal_ids.length > 0 ? form.materiaal_ids : [],
                status: 'concept',
                ruimte_geregeld: false,
                in_jaarkalender: false,
                in_webshop: false,
                webshop_product_url: null,
                opmerkingen: form.opmerkingen || null,
                uitvoerder_id: null,
                planning_batch_id: null,
                aangemaakt_door: medewerker.id,
            })
            navigate('/kalender')
        } catch (err) {
            console.error(err)
            alert('Fout bij inplannen: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="app-container pt-8"><LaadIndicator /></div>

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button onClick={() => navigate('/kalender')} className="flex items-center gap-1 text-text-muted hover:text-text-primary mb-4 text-sm">
                <ArrowLeft size={16} /> Terug naar kalender
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarDays size={24} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">Workshop inplannen</h1>
            </div>

            <form onSubmit={handleOpslaan} className="space-y-4">
                {/* Workshop kiezen */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Workshop</h2>
                    <div>
                        <label className="label">Workshop type *</label>
                        <select
                            className="input"
                            value={form.template_id}
                            onChange={e => selecteerTemplate(e.target.value)}
                            required
                        >
                            <option value="">— Kies een workshop —</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.titel}</option>
                            ))}
                        </select>
                    </div>

                    {/* Materiaal uit database */}
                    {geselecteerdeTemplate && gekoppeldMateriaal.length > 0 && (
                        <div>
                            <label className="label flex items-center gap-1.5">
                                <Package size={13} /> Materiaal
                            </label>
                            <div className="space-y-2">
                                {gekoppeldMateriaal.map(mat => {
                                    const isSelected = form.materiaal_ids.includes(mat.id)
                                    const conflict = materiaalConflicten[mat.id]
                                    const heeftConflict = isSelected && conflict && !conflict.beschikbaar
                                    return (
                                        <label
                                            key={mat.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                isSelected
                                                    ? heeftConflict ? 'border-amber-500 bg-amber-500/5' : 'border-primary bg-primary/5'
                                                    : 'border-overlay/20 bg-bg-surface hover:border-primary/40'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleMateriaal(mat.id)}
                                                className="accent-primary"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-text-primary">{mat.naam}</p>
                                                {mat.type && <p className="text-xs text-text-muted">{mat.type}</p>}
                                            </div>
                                            {isSelected && form.datum && conflict && (
                                                conflict.beschikbaar ? (
                                                    <Check size={16} className="text-success flex-shrink-0" />
                                                ) : (
                                                    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                                                )
                                            )}
                                        </label>
                                    )
                                })}
                                {/* Toon conflictdetails als er waarschuwingen zijn */}
                                {form.datum && Object.entries(materiaalConflicten)
                                    .filter(([matId, c]) => form.materiaal_ids.includes(matId) && !c.beschikbaar)
                                    .map(([matId, c]) => (
                                        <ConflictBanner
                                            key={matId}
                                            conflicten={c.conflicten}
                                            mode="warn"
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* Aanvullend materiaal (vrije tekst) */}
                    {geselecteerdeTemplate?.materiaal_omschrijving && (
                        <div className="bg-bg-app rounded-lg p-3 text-sm">
                            <p className="text-text-muted text-xs mb-1">Aanvullend materiaal</p>
                            <p className="text-text-primary flex items-center gap-1.5">
                                <BookOpen size={14} className="text-primary flex-shrink-0" />
                                {geselecteerdeTemplate.materiaal_omschrijving}
                            </p>
                        </div>
                    )}
                </div>

                {/* Datum & tijd */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Wanneer & waar</h2>
                    <div>
                        <label className="label">Datum *</label>
                        <input className="input" type="date" value={form.datum} onChange={e => update('datum', e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Starttijd</label>
                            <input className="input" type="time" value={form.start_tijd} onChange={e => update('start_tijd', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Eindtijd</label>
                            <input className="input" type="time" value={form.eind_tijd} onChange={e => update('eind_tijd', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Locatie *</label>
                        <select className="input" value={form.locatie} onChange={e => update('locatie', e.target.value)} required>
                            {LOCATIES.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                    </div>
                </div>

                {/* Details */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Details</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Max deelnemers</label>
                            <input className="input" type="number" min="1" value={form.max_deelnemers} onChange={e => update('max_deelnemers', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Kosten (EUR)</label>
                            <input className="input" type="number" min="0" step="0.50" value={form.kosten} onChange={e => update('kosten', e.target.value)} placeholder="0.00" />
                        </div>
                    </div>
                    <div>
                        <label className="label">Opmerkingen</label>
                        <textarea className="input min-h-[60px]" value={form.opmerkingen} onChange={e => update('opmerkingen', e.target.value)} placeholder="bijv. Nationale Kinderboekenweek" />
                    </div>
                </div>

                <button type="submit" disabled={saving} className="btn-primary py-3 px-6 flex items-center gap-2 w-full justify-center">
                    <Save size={16} /> {saving ? 'Opslaan...' : 'Workshop inplannen'}
                </button>
            </form>
        </div>
    )
}
