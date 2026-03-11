import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMateriaalaItemById, updateMateriaal } from '../lib/materiaal'
import { ArrowLeft, Save, Tag } from 'lucide-react'
import { LaadIndicator } from '../components/UI'

const TYPES = [
    'Codeer-robot', 'VR-set', 'Lasersnijder', '3D-printer',
    'Laptop', 'Tablet', 'Chromebook', 'Camera', 'Microfoon',
    'Beamer', 'Audioapparatuur', 'Kabel', 'Overig',
]
const LOCATIES = ['Ermelo', 'Nunspeet']

export default function MateriaalBewerken() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [form, setForm] = useState({
        naam: '',
        merk: '',
        type: '',
        categorie_prefix: '',
        aantal: '',
        omschrijving: '',
        inhoud: '',
        standaard_locatie: '',
    })
    const [bestaandeCode, setBestaandeCode] = useState('')
    const [loading, setLoading] = useState(true)
    const [opslaan, setOpslaan] = useState(false)
    const [fout, setFout] = useState('')
    const [succes, setSucces] = useState(false)

    useEffect(() => {
        getMateriaalaItemById(id)
            .then(item => {
                setBestaandeCode(item.qr_code || '')
                setForm({
                    naam: item.naam || '',
                    merk: item.merk || '',
                    type: item.type || '',
                    categorie_prefix: item.categorie_prefix || '',
                    aantal: item.aantal != null ? String(item.aantal) : '',
                    omschrijving: item.omschrijving || '',
                    inhoud: item.inhoud || '',
                    standaard_locatie: item.standaard_locatie || '',
                })
            })
            .catch(() => setFout('Item niet gevonden'))
            .finally(() => setLoading(false))
    }, [id])

    const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.naam.trim()) return setFout('Naam is verplicht')
        if (!form.type) return setFout('Type is verplicht')
        if (!form.standaard_locatie) return setFout('Standaard locatie is verplicht')

        setOpslaan(true)
        setFout('')
        try {
            await updateMateriaal(id, {
                naam: form.naam.trim(),
                merk: form.merk.trim() || null,
                type: form.type,
                aantal: form.aantal ? parseInt(form.aantal, 10) : null,
                omschrijving: form.omschrijving.trim() || null,
                inhoud: form.inhoud.trim() || null,
                standaard_locatie: form.standaard_locatie,
            })
            setSucces(true)
            setTimeout(() => navigate(-1), 1200)
        } catch (err) {
            setFout(err.message || 'Opslaan mislukt')
        } finally {
            setOpslaan(false)
        }
    }

    if (loading) return <div className="app-container pt-8"><LaadIndicator /></div>

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary transition-colors">
                <ArrowLeft size={18} /> Terug
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-end flex items-center justify-center shadow-lg shadow-accent/30">
                    <Save size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Item bewerken</h1>
                    {bestaandeCode && (
                        <p className="text-xs font-mono text-text-muted mt-0.5">{bestaandeCode}</p>
                    )}
                </div>
            </div>

            {succes && (
                <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-success text-sm mb-4">
                    ✓ Wijzigingen opgeslagen!
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Basisgegevens */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Basisgegevens</h2>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Naam *</label>
                        <input
                            type="text"
                            className="input"
                            value={form.naam}
                            onChange={e => update('naam', e.target.value)}
                            disabled={opslaan}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">Merk</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Bijv. Sphero"
                                value={form.merk}
                                onChange={e => update('merk', e.target.value)}
                                disabled={opslaan}
                            />
                        </div>
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">Aantal stuks</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="Bijv. 8"
                                min="1"
                                value={form.aantal}
                                onChange={e => update('aantal', e.target.value)}
                                disabled={opslaan}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Type *</label>
                        <select
                            className="input"
                            value={form.type}
                            onChange={e => update('type', e.target.value)}
                            disabled={opslaan}
                        >
                            <option value="">Kies type...</option>
                            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Standaard locatie *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {LOCATIES.map(loc => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => update('standaard_locatie', loc)}
                                    className={`card p-3 text-center text-sm font-medium transition-all ${form.standaard_locatie === loc
                                        ? 'border-primary text-primary bg-primary/10'
                                        : 'text-text-secondary hover:bg-bg-hover'
                                        }`}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Productcode (readonly) */}
                <div className="card p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Tag size={16} className="text-text-muted" />
                        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Productcode</h2>
                    </div>
                    <div className="bg-bg-app rounded-lg p-3 flex items-center gap-3">
                        <code className="text-base font-mono font-bold text-text-primary tracking-widest flex-1">
                            {bestaandeCode || '—'}
                        </code>
                        <span className="text-xs text-text-muted bg-white/5 rounded px-2 py-0.5">Niet aanpasbaar</span>
                    </div>
                    <p className="text-text-muted text-xs mt-2">
                        De productcode wordt bij aanmaken vastgesteld en verandert niet meer.
                    </p>
                </div>

                {/* Omschrijving & Inhoud */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Beschrijving</h2>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Omschrijving</label>
                        <textarea
                            className="input min-h-[90px] resize-y"
                            placeholder="Beschrijf het apparaat: merk, model, kenmerken, geschiktheid..."
                            value={form.omschrijving}
                            onChange={e => update('omschrijving', e.target.value)}
                            disabled={opslaan}
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Inhoud / Onderdelen</label>
                        <textarea
                            className="input min-h-[90px] resize-y"
                            placeholder="Wat zit er in de set? Bijv: 1x laptop, 1x oplader, 1x tas..."
                            value={form.inhoud}
                            onChange={e => update('inhoud', e.target.value)}
                            disabled={opslaan}
                            rows={3}
                        />
                    </div>
                </div>

                {fout && (
                    <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                        {fout}
                    </div>
                )}

                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={opslaan}>
                    {opslaan
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><Save size={16} /> Wijzigingen opslaan</>
                    }
                </button>
            </form>
        </div>
    )
}
