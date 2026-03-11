import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAllMeldingen, sluitMelding } from '../lib/onderhoud'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator, DatumTijd } from '../components/UI'
import Modal from '../components/Modal'
import PincodeInvoer from '../components/PincodeInvoer'
import { verifyPin } from '../lib/auth'
import {
    Wrench, Plus, AlertTriangle, CheckCircle2, Package,
    ChevronRight, Clock, User
} from 'lucide-react'

const TYPE_LABELS = {
    kapot: { label: 'Kapot', icon: '🔧', kleur: 'text-error' },
    mist: { label: 'Mist onderdeel', icon: '🔍', kleur: 'text-amber-400' },
    verbruiksmateriaal: { label: 'Verbruiksmateriaal', icon: '🔋', kleur: 'text-blue-400' },
    anders: { label: 'Anders', icon: '💬', kleur: 'text-text-muted' },
}

export default function MeldingenOverzicht() {
    const { medewerker } = useAuth()
    const navigate = useNavigate()
    const [meldingen, setMeldingen] = useState([])
    const [gefilterd, setGefilterd] = useState([])
    const [statusFilter, setStatusFilter] = useState('open')
    const [loading, setLoading] = useState(true)

    // Sluiten-flow
    const [sluitenMelding, setSluitenMelding] = useState(null)
    const [pinLoading, setPinLoading] = useState(false)
    const [pinFout, setPinFout] = useState('')

    const laad = async () => {
        setLoading(true)
        try {
            const data = await getAllMeldingen()
            setMeldingen(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { laad() }, [])

    useEffect(() => {
        if (statusFilter === 'alle') setGefilterd(meldingen)
        else setGefilterd(meldingen.filter(m => m.status === statusFilter))
    }, [statusFilter, meldingen])

    const aantalOpen = meldingen.filter(m => m.status === 'open').length
    const aantalOpgelost = meldingen.filter(m => m.status === 'opgelost').length

    const handleSluitPin = async (pin) => {
        setPinLoading(true)
        setPinFout('')
        try {
            await verifyPin(medewerker.id, pin)
            await sluitMelding(sluitenMelding.id, medewerker.id)
            setSluitenMelding(null)
            await laad()
        } catch (err) {
            setPinFout(err.message || 'Onjuiste pincode')
        } finally {
            setPinLoading(false)
        }
    }

    const filters = [
        { key: 'open', label: `Open (${aantalOpen})`, icon: <AlertTriangle size={13} /> },
        { key: 'opgelost', label: `Opgelost (${aantalOpgelost})`, icon: <CheckCircle2 size={13} /> },
        { key: 'alle', label: `Alle (${meldingen.length})`, icon: null },
    ]

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Meldingen</h1>
                    <p className="text-text-muted text-sm mt-0.5">Onderhoud & incidenten</p>
                </div>
                <Link
                    to="/melding/nieuw"
                    className="btn-accent py-2 px-4 text-sm flex items-center gap-2"
                >
                    <Plus size={16} /> Nieuwe melding
                </Link>
            </div>

            {/* Status filters */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                {filters.map(({ key, label, icon }) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5 ${statusFilter === key
                                ? key === 'open'
                                    ? 'bg-error text-white shadow-lg shadow-error/30'
                                    : key === 'opgelost'
                                        ? 'bg-success text-white shadow-lg shadow-success/30'
                                        : 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'bg-bg-surface border border-white/10 text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {icon}{label}
                    </button>
                ))}
            </div>

            {/* Lijst */}
            {loading ? (
                <LaadIndicator />
            ) : gefilterd.length === 0 ? (
                <div className="card p-10 text-center">
                    <Wrench size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">
                        {statusFilter === 'open' ? 'Geen openstaande meldingen 🎉' : 'Geen meldingen gevonden'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {gefilterd.map(m => {
                        const typeInfo = TYPE_LABELS[m.type_melding] || { label: m.type_melding, icon: '❓', kleur: 'text-text-muted' }
                        const isOpen = m.status === 'open'

                        return (
                            <div key={m.id} className={`card overflow-hidden ${isOpen ? 'border-l-2 border-l-error' : 'border-l-2 border-l-success/40'}`}>
                                {/* Klikbaar deel → naar item */}
                                <Link
                                    to={`/item/${m.materiaal?.qr_code || '#'}`}
                                    className="flex items-start gap-3 p-4 hover:bg-bg-hover transition-colors"
                                >
                                    {/* Type icoon */}
                                    <div className="w-9 h-9 rounded-lg bg-bg-app flex items-center justify-center flex-shrink-0 text-base mt-0.5">
                                        {typeInfo.icon}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Item naam + type badge */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-text-primary truncate">{m.materiaal?.naam || 'Onbekend item'}</p>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 ${typeInfo.kleur}`}>
                                                {typeInfo.label}
                                            </span>
                                        </div>

                                        {/* Toelichting */}
                                        {m.toelichting && (
                                            <p className="text-text-secondary text-sm mt-0.5 line-clamp-2">{m.toelichting}</p>
                                        )}

                                        {/* Meta-info */}
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                                <User size={11} />{m.gemeld_door_medewerker?.naam || '—'}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                                <Clock size={11} /><DatumTijd tijdstip={m.tijdstip_gemeld} compact />
                                            </span>
                                            {!isOpen && m.opgelost_door_medewerker && (
                                                <span className="flex items-center gap-1 text-xs text-success">
                                                    <CheckCircle2 size={11} /> Opgelost door {m.opgelost_door_medewerker.naam}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight size={16} className="text-text-muted flex-shrink-0 mt-1" />
                                </Link>

                                {/* Sluiten-knop — alleen bij open meldingen */}
                                {isOpen && (
                                    <div className="px-4 pb-3 pt-0">
                                        <button
                                            onClick={() => { setSluitenMelding(m); setPinFout('') }}
                                            className="btn-ghost py-2 px-3 text-xs flex items-center gap-1.5 text-success border-success/30 hover:bg-success/10"
                                        >
                                            <CheckCircle2 size={14} /> Als opgelost markeren
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <p className="text-center text-text-muted text-xs mt-4">
                {gefilterd.length} melding{gefilterd.length !== 1 ? 'en' : ''}
            </p>

            {/* Modal: melding sluiten */}
            {sluitenMelding && (
                <Modal title="Melding afsluiten" onClose={() => setSluitenMelding(null)}>
                    <div className="mb-4">
                        <p className="text-text-secondary text-sm">
                            Markeer de melding voor <strong className="text-text-primary">{sluitenMelding.materiaal?.naam}</strong> als opgelost.
                        </p>
                        <p className="text-text-muted text-xs mt-1">Bevestig met jouw pincode.</p>
                    </div>
                    <PincodeInvoer
                        onBevestig={handleSluitPin}
                        loading={pinLoading}
                        error={pinFout}
                        label="Jouw pincode"
                    />
                </Modal>
            )}
        </div>
    )
}
