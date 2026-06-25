import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { maakMelding, uploadFoto } from '../lib/onderhoud'
import { getAllMateriaal } from '../lib/materiaal'
import MateriaalSelect from '../components/MateriaalSelect'
import { useToast } from '../context/ToastContext'
import { foutTekst } from '../lib/foutmelding'
import { ArrowLeft, Wrench, Camera, X } from 'lucide-react'

const TYPEN = [
    { key: 'kapot', label: '🔧 Iets is kapot', beschrijving: 'Apparaat of onderdeel functioneert niet correct' },
    { key: 'mist', label: '🔍 Onderdeel of accessoire mist', beschrijving: 'Kabel, oplader, hoesje of ander onderdeel ontbreekt' },
    { key: 'verbruiksmateriaal', label: '🔋 Verbruiksmateriaal op', beschrijving: 'Batterijen, papier of ander verbruiksmateriaal is op' },
    { key: 'anders', label: '💬 Anders', beschrijving: 'Iets anders — gebruik de toelichting om te beschrijven wat er is' },
]

export default function OnderhoudMelden() {
    const { materiaalId } = useParams()   // /melding/nieuw/:materiaalId
    const { medewerker } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    const [alleItems, setAlleItems] = useState([])
    const [gekozenItemId, setGekozenItemId] = useState(materiaalId || '')
    const [gekozenType, setGekozenType] = useState('')
    const [toelichting, setToelichting] = useState('')
    const [foto, setFoto] = useState(null)
    const [fotoPreview, setFotoPreview] = useState('')
    const [loading, setLoading] = useState(false)
    const [fout, setFout] = useState('')

    useEffect(() => {
        getAllMateriaal()
            .then(setAlleItems)
            .catch(console.error)
    }, [])

    const handleFoto = (e) => {
        const bestand = e.target.files[0]
        if (!bestand) return
        setFoto(bestand)
        setFotoPreview(URL.createObjectURL(bestand))
    }

    const verwijderFoto = () => {
        setFoto(null)
        if (fotoPreview) URL.revokeObjectURL(fotoPreview)
        setFotoPreview('')
    }

    const handleBevestig = async () => {
        if (!gekozenItemId) return setFout('Kies materiaal')
        if (!gekozenType) return setFout('Kies een type melding')
        setFout('')
        setLoading(true)
        try {
            let fotoUrl = null
            if (foto) {
                fotoUrl = await uploadFoto(foto, gekozenItemId)
            }

            await maakMelding({
                materiaalId: gekozenItemId,
                medewerkerId: medewerker.id,
                typeMelding: gekozenType,
                toelichting,
                fotoUrl,
            })

            toast.succes('Melding ingediend — zichtbaar voor alle medewerkers.')
            navigate('/melding')
        } catch (err) {
            toast.fout(foutTekst(err, 'Melding indienen lukte niet — probeer het opnieuw.'))
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-end flex items-center justify-center shadow-lg shadow-accent/30">
                    <Wrench size={18} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">Melding maken</h1>
            </div>

            <div className="space-y-4">
                {/* Materiaal selecteren */}
                <div className="card p-4">
                    <label className="block text-text-secondary text-sm font-medium mb-3">1. Welk materiaal?</label>
                    <MateriaalSelect
                        items={alleItems}
                        value={gekozenItemId}
                        onChange={setGekozenItemId}
                        placeholder="Zoek en kies materiaal..."
                    />
                </div>

                {/* Type melding */}
                <div className="card p-4">
                    <label className="block text-text-secondary text-sm font-medium mb-3">2. Wat is er aan de hand?</label>
                    <div className="space-y-2">
                        {TYPEN.map(({ key, label, beschrijving }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setGekozenType(key)}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${gekozenType === key
                                    ? 'border-accent bg-accent/10'
                                    : 'border-overlay/10 bg-bg-app hover:border-overlay/20'
                                    }`}
                            >
                                <p className="font-medium text-text-primary text-sm">{label}</p>
                                <p className="text-text-muted text-xs mt-0.5">{beschrijving}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toelichting */}
                <div className="card p-4">
                    <label className="block text-text-secondary text-sm font-medium mb-3">3. Toelichting (optioneel)</label>
                    <textarea
                        className="input resize-none"
                        rows={3}
                        placeholder="Beschrijf het probleem..."
                        value={toelichting}
                        onChange={e => setToelichting(e.target.value)}
                    />
                </div>

                {/* Foto */}
                <div className="card p-4">
                    <label className="block text-text-secondary text-sm font-medium mb-3">4. Foto (optioneel)</label>
                    {fotoPreview ? (
                        <div className="relative">
                            <img src={fotoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                            <button
                                onClick={verwijderFoto}
                                className="absolute top-2 right-2 w-8 h-8 bg-error rounded-full flex items-center justify-center shadow-lg"
                            >
                                <X size={14} className="text-white" />
                            </button>
                        </div>
                    ) : (
                        <label className="w-full h-32 border-2 border-dashed border-overlay/20 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-overlay/40 transition-colors">
                            <Camera size={24} className="text-text-muted" />
                            <span className="text-text-muted text-sm">Foto toevoegen</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                        </label>
                    )}
                </div>

                {fout && (
                    <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                        {fout}
                    </div>
                )}

                <button
                    onClick={handleBevestig}
                    className="btn-accent w-full flex items-center justify-center gap-2"
                    disabled={loading}
                >
                    {loading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><Wrench size={18} /> Melding indienen</>
                    }
                </button>
            </div>
        </div>
    )
}
