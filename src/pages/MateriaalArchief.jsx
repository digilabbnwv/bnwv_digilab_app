import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getGearchiveerdMateriaal, herstelMateriaal } from '../lib/materiaal'
import { LaadIndicator } from '../components/UI'
import { useToast } from '../context/ToastContext'
import { foutTekst } from '../lib/foutmelding'
import { ArrowLeft, Archive, ArchiveRestore, Package } from 'lucide-react'

export default function MateriaalArchief() {
    const navigate = useNavigate()
    const toast = useToast()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [bezigId, setBezigId] = useState(null)

    const laad = () => {
        setLoading(true)
        getGearchiveerdMateriaal()
            .then(setItems)
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(laad, [])

    const handleHerstellen = async (item) => {
        setBezigId(item.id)
        try {
            await herstelMateriaal(item.id)
            toast.succes(`${item.naam} hersteld uit archief`)
            laad()
        } catch (err) {
            toast.fout(foutTekst(err, 'Herstellen lukte niet — probeer het opnieuw.'))
        } finally {
            setBezigId(null)
        }
    }

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary transition-colors">
                <ArrowLeft size={18} /> Terug
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-end flex items-center justify-center shadow-lg shadow-accent/30">
                    <Archive size={18} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">Gearchiveerd materiaal</h1>
            </div>

            {loading ? (
                <LaadIndicator />
            ) : items.length === 0 ? (
                <div className="card p-8 text-center">
                    <Archive size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Nog geen gearchiveerd materiaal</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map(item => (
                        <div key={item.id} className="card flex items-center gap-3 p-4">
                            <Link to={`/item/${item.qr_code}`} className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-overlay/10 flex items-center justify-center flex-shrink-0">
                                    <Package size={18} className="text-text-muted" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text-primary truncate">{item.naam}</p>
                                    <p className="text-xs text-text-muted">{item.type}</p>
                                </div>
                            </Link>
                            <button
                                onClick={() => handleHerstellen(item)}
                                disabled={bezigId === item.id}
                                className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-1.5 flex-shrink-0"
                            >
                                <ArchiveRestore size={14} /> {bezigId === item.id ? 'Bezig...' : 'Herstellen'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-center text-text-muted text-xs mt-4">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
    )
}
