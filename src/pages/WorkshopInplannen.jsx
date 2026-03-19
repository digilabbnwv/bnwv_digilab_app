import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAlleWorkshopTemplates } from '../lib/workshops'
import { getAllMateriaal } from '../lib/materiaal'
import { maakGeplandeWorkshop } from '../lib/geplandeWorkshops'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import { ArrowLeft, Save, BookOpen, CalendarDays, Package } from 'lucide-react'

const LOCATIES = ['Ermelo', 'Nunspeet', 'Harderwijk', 'Putten', 'Elspeet']

export default function WorkshopInplannen() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { medewerker } = useAuth()
    const [templates, setTemplates] = useState([])
    const [allMateriaal, setAllMateriaal] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({
        template_id: searchParams.get('template') || '',
        datum: '',
        start_tijd: '15:30',
        eind_tijd: '16:30',
        locatie: 'Ermelo',
        doelgroep: '',
        max_deelnemers: '',
        kosten: '',
        materiaal_id: '',
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
                    const mat = (tmpl.materiaal_ids || [])
                        .map(id => matData.find(m => m.id === id))
                        .filter(Boolean)
                    setForm(f => ({
                        ...f,
                        doelgroep: tmpl.doelgroep || f.doelgroep,
                        max_deelnemers: tmpl.max_deelnemers || f.max_deelnemers,
                        kosten: tmpl.standaard_kosten ?? f.kosten,
                        start_tijd: tmpl.titel?.includes('VibeLab') ? '13:00' : f.start_tijd,
                        eind_tijd: tmpl.titel?.includes('VibeLab') ? '14:30' : f.eind_tijd,
                        materiaal_id: mat.length === 1 ? mat[0].id : '',
                    }))
                }
            }
        })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const geselecteerdeTemplate = templates.find(t => t.id === form.template_id)
    const gekoppeldMateriaal = (geselecteerdeTemplate?.materiaal_ids || [])
        .map(id => allMateriaal.find(m => m.id === id))
        .filter(Boolean)

    function selecteerTemplate(templateId) {
        const tmpl = templates.find(t => t.id === templateId)
        const mat = (tmpl?.materiaal_ids || [])
            .map(id => allMateriaal.find(m => m.id === id))
            .filter(Boolean)
        setForm(f => ({
            ...f,
            template_id: templateId,
            doelgroep: tmpl?.doelgroep || f.doelgroep,
            max_deelnemers: tmpl?.max_deelnemers || f.max_deelnemers,
            kosten: tmpl?.standaard_kosten ?? f.kosten,
            start_tijd: tmpl?.titel?.includes('VibeLab') ? '13:00' : f.start_tijd,
            eind_tijd: tmpl?.titel?.includes('VibeLab') ? '14:30' : f.eind_tijd,
            materiaal_id: mat.length === 1 ? mat[0].id : '',
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
                materiaal_id: form.materiaal_id || null,
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
                            {gekoppeldMateriaal.length === 1 ? (
                                <div className="bg-primary/10 rounded-lg px-3 py-2.5 flex items-center gap-2">
                                    <Package size={14} className="text-primary flex-shrink-0" />
                                    <span className="text-sm font-medium text-primary">{gekoppeldMateriaal[0].naam}</span>
                                    <span className="text-xs text-primary/60 ml-auto">Automatisch geselecteerd</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {gekoppeldMateriaal.map(mat => (
                                        <label
                                            key={mat.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                form.materiaal_id === mat.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-overlay/20 bg-bg-surface hover:border-primary/40'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="materiaal_id"
                                                value={mat.id}
                                                checked={form.materiaal_id === mat.id}
                                                onChange={() => update('materiaal_id', mat.id)}
                                                className="accent-primary"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{mat.naam}</p>
                                                {mat.type && <p className="text-xs text-text-muted">{mat.type}</p>}
                                            </div>
                                        </label>
                                    ))}
                                    {!form.materiaal_id && (
                                        <p className="text-xs text-amber-400 mt-1">Selecteer het materiaal dat je wilt gebruiken</p>
                                    )}
                                </div>
                            )}
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
