import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMateriaal, mockPreviewCode } from '../lib/materiaal'
import { ArrowLeft, Package, Tag, RefreshCw } from 'lucide-react'

const TYPES = [
    'Codeer-robot', 'VR-set', 'Lasersnijder', '3D-printer',
    'Laptop', 'Tablet', 'Chromebook', 'Camera', 'Microfoon',
    'Beamer', 'Audioapparatuur', 'Kabel', 'Overig',
]
const LOCATIES = ['Ermelo', 'Nunspeet']

const PREFIX_SUGGESTIES = {
    'Codeer-robot': 'ROBO',
    'VR-set': 'VRST',
    'Lasersnijder': 'LASR',
    '3D-printer': 'DPRI',
    'Laptop': 'LAPT',
    'Tablet': 'TABL',
    'Chromebook': 'CHRO',
    'Camera': 'CAME',
    'Microfoon': 'MICO',
    'Beamer': 'BEAM',
    'Audioapparatuur': 'AUDI',
    'Kabel': 'KABL',
    'Overig': 'OVER',
}

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

export default function NieuwMateriaal() {
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
    const [codePreview, setCodePreview] = useState('')
    const [prefixHandmatig, setPrefixHandmatig] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fout, setFout] = useState('')

    const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

    useEffect(() => {
        if (!form.categorie_prefix || form.categorie_prefix.length !== 4) {
            setCodePreview('')
            return
        }
        const prefix = form.categorie_prefix.toUpperCase()
        if (MOCK) {
            setCodePreview(mockPreviewCode(prefix))
        } else {
            setCodePreview(`BNWV-DIGI-${prefix}-????`)
        }
    }, [form.categorie_prefix])

    const handleTypeChange = (type) => {
        update('type', type)
        if (!prefixHandmatig) {
            update('categorie_prefix', PREFIX_SUGGESTIES[type] || '')
        }
    }

    const handlePrefixChange = (val) => {
        const clean = val.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4)
        update('categorie_prefix', clean)
        setPrefixHandmatig(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.naam.trim()) return setFout('Naam is verplicht')
        if (!form.type) return setFout('Type is verplicht')
        if (form.categorie_prefix.length !== 4) return setFout('Categorie-prefix moet exact 4 letters zijn')
        if (!form.standaard_locatie) return setFout('Standaard locatie is verplicht')

        setLoading(true)
        setFout('')
        try {
            const item = await addMateriaal({
                naam: form.naam.trim(),
                merk: form.merk.trim() || null,
                type: form.type,
                categorie_prefix: form.categorie_prefix.toUpperCase(),
                aantal: form.aantal ? parseInt(form.aantal, 10) : null,
                omschrijving: form.omschrijving.trim() || null,
                inhoud: form.inhoud.trim() || null,
                standaard_locatie: form.standaard_locatie,
                huidige_locatie: form.standaard_locatie,
            })
            navigate(`/item/${item.qr_code}`)
        } catch (err) {
            setFout(err.message || 'Opslaan mislukt')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary transition-colors">
                <ArrowLeft size={18} /> Terug
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-end flex items-center justify-center shadow-lg shadow-primary/30">
                    <Package size={18} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">Nieuw item</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Basisgegevens */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Basisgegevens</h2>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Naam *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Bijv. Sphero Indi — Ermelo"
                            value={form.naam}
                            onChange={e => update('naam', e.target.value)}
                            disabled={loading}
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
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">
                                Aantal stuks
                            </label>
                            <input
                                type="number"
                                className="input"
                                placeholder="Bijv. 8"
                                min="1"
                                value={form.aantal}
                                onChange={e => update('aantal', e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Type *</label>
                        <select
                            className="input"
                            value={form.type}
                            onChange={e => handleTypeChange(e.target.value)}
                            disabled={loading}
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

                {/* BNWV Code */}
                <div className="card p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Tag size={16} className="text-accent" />
                        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Productcode</h2>
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">
                            Categorie-prefix *
                            <span className="text-text-muted font-normal ml-2">— 4 letters, geeft soort product aan</span>
                        </label>
                        <div className="flex gap-3 items-center">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    className="input font-mono uppercase tracking-widest"
                                    placeholder="ROBO"
                                    maxLength={4}
                                    value={form.categorie_prefix}
                                    onChange={e => handlePrefixChange(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            {form.type && PREFIX_SUGGESTIES[form.type] !== form.categorie_prefix && (
                                <button
                                    type="button"
                                    onClick={() => { update('categorie_prefix', PREFIX_SUGGESTIES[form.type] || ''); setPrefixHandmatig(false) }}
                                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-end transition-colors whitespace-nowrap"
                                >
                                    <RefreshCw size={12} /> Suggestie
                                </button>
                            )}
                        </div>

                        {form.type && (
                            <p className="text-text-muted text-xs mt-2">
                                Suggestie voor {form.type}:
                                <button
                                    type="button"
                                    className="ml-1 font-mono text-accent hover:text-accent-end"
                                    onClick={() => { update('categorie_prefix', PREFIX_SUGGESTIES[form.type] || ''); setPrefixHandmatig(false) }}
                                >
                                    {PREFIX_SUGGESTIES[form.type]}
                                </button>
                            </p>
                        )}
                    </div>

                    {codePreview && (
                        <div className="bg-bg-app rounded-xl p-4 border border-overlay/10">
                            <p className="text-text-muted text-xs mb-1">Productcode wordt:</p>
                            <code className="text-lg font-bold font-mono text-primary tracking-widest">{codePreview}</code>
                            <p className="text-text-muted text-xs mt-2">
                                <span className="text-text-secondary">BNWV-DIGI</span> — bibliotheek + digilab
                                {' · '}
                                <span className="text-text-secondary">{form.categorie_prefix.toUpperCase()}</span> — categorie
                                {' · '}
                                <span className="text-text-secondary">0001</span> — volgnummer
                            </p>
                        </div>
                    )}
                </div>

                {/* Omschrijving & Inhoud */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Beschrijving</h2>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Omschrijving</label>
                        <textarea
                            className="input min-h-[90px] resize-y"
                            placeholder="Beschrijf het product: merk, model, kenmerken, doelgroep..."
                            value={form.omschrijving}
                            onChange={e => update('omschrijving', e.target.value)}
                            disabled={loading}
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Inhoud / Onderdelen</label>
                        <textarea
                            className="input min-h-[90px] resize-y"
                            placeholder="Wat zit er in de set? Bijv: 8x Sphero Indi, 8x USB-C oplaadkabel, opbergdoos..."
                            value={form.inhoud}
                            onChange={e => update('inhoud', e.target.value)}
                            disabled={loading}
                            rows={3}
                        />
                    </div>
                </div>

                {fout && (
                    <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                        {fout}
                    </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                    {loading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                        : 'Item opslaan & QR genereren'
                    }
                </button>
            </form>
        </div>
    )
}
