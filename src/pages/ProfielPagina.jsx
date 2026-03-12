import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyPin, updatePincode, updateNaam } from '../lib/auth'
import { getMijnTransacties } from '../lib/materiaal'
import { DatumTijd, LaadIndicator } from '../components/UI'
import Modal from '../components/Modal'
import PincodeInvoer from '../components/PincodeInvoer'
import { useTheme } from '../context/ThemeContext'
import { LogOut, User, Key, Clock, ChevronRight, Package, ArrowUpCircle, ArrowDownCircle, Sun, Monitor, Moon, Pencil, Check, X } from 'lucide-react'

export default function ProfielPagina() {
    const { medewerker, logout, updateMedewerker } = useAuth()
    const { thema, setThema } = useTheme()
    const navigate = useNavigate()

    const [historie, setHistorie] = useState([])
    const [loading, setLoading] = useState(true)
    const [toonPinWijzigen, setToonPinWijzigen] = useState(false)
    const [pinStap, setPinStap] = useState(1) // 1=oud, 2=nieuw
    const [oudePin, setOudePin] = useState('')
    const [pinFout, setPinFout] = useState('')
    const [pinLoading, setPinLoading] = useState(false)
    const [pinSucces, setPinSucces] = useState(false)

    // Naam bewerken
    const [naamBewerken, setNaamBewerken] = useState(false)
    const [nieuweNaam, setNieuweNaam] = useState('')
    const [naamLoading, setNaamLoading] = useState(false)

    useEffect(() => {
        getMijnTransacties(medewerker.id)
            .then(setHistorie)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [medewerker.id])

    const handleNaamOpslaan = async () => {
        const trimmed = nieuweNaam.trim()
        if (!trimmed || trimmed === medewerker.naam) {
            setNaamBewerken(false)
            return
        }
        setNaamLoading(true)
        try {
            await updateNaam(medewerker.id, trimmed)
            updateMedewerker({ naam: trimmed })
            setNaamBewerken(false)
        } catch (err) {
            console.error(err)
        } finally {
            setNaamLoading(false)
        }
    }

    const handleUitloggen = () => {
        logout()
        navigate('/login')
    }

    const handleOudePin = async (pin) => {
        setPinLoading(true)
        setPinFout('')
        try {
            await verifyPin(medewerker.id, pin)
            setOudePin(pin)
            setPinStap(2)
        } catch {
            setPinFout('Onjuiste pincode')
        } finally {
            setPinLoading(false)
        }
    }

    const handleNieuwePin = async (pin) => {
        if (pin === oudePin) {
            setPinFout('Nieuwe pincode mag niet hetzelfde zijn als de oude')
            return
        }
        setPinLoading(true)
        setPinFout('')
        try {
            await updatePincode(medewerker.id, pin)
            setPinSucces(true)
            setTimeout(() => {
                setToonPinWijzigen(false)
                setPinStap(1)
                setPinSucces(false)
            }, 2000)
        } catch (err) {
            setPinFout(err.message || 'Pincode wijzigen mislukt')
        } finally {
            setPinLoading(false)
        }
    }

    const typeIcoon = (type) => {
        if (type === 'uitchecken') return <ArrowUpCircle size={14} className="text-accent" />
        if (type === 'inchecken') return <ArrowDownCircle size={14} className="text-success" />
        if (type === 'overrule') return <ArrowDownCircle size={14} className="text-error" />
        return <Package size={14} className="text-text-muted" />
    }

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <h1 className="text-2xl font-bold text-text-primary mb-6">Mijn profiel</h1>

            {/* Profielkaart */}
            <div className="card p-5 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-end flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="text-xl font-bold text-white">
                            {medewerker.naam?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        {naamBewerken ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={nieuweNaam}
                                    onChange={e => setNieuweNaam(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleNaamOpslaan()}
                                    className="input py-1 px-2 text-lg font-bold flex-1"
                                    autoFocus
                                    disabled={naamLoading}
                                />
                                <button onClick={handleNaamOpslaan} disabled={naamLoading} className="p-1.5 rounded-lg text-success hover:bg-success/10 transition-colors">
                                    <Check size={18} />
                                </button>
                                <button onClick={() => setNaamBewerken(false)} className="p-1.5 rounded-lg text-text-muted hover:bg-bg-hover transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { setNaamBewerken(true); setNieuweNaam(medewerker.naam) }}
                                className="flex items-center gap-2 group text-left"
                            >
                                <h2 className="text-lg font-bold text-text-primary">{medewerker.naam}</h2>
                                <Pencil size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}
                        <p className="text-text-muted text-sm">{medewerker.email}</p>
                    </div>
                </div>
            </div>

            {/* Weergave */}
            <div className="card p-4 mb-4">
                <p className="text-text-secondary text-sm font-medium mb-3">Weergave</p>
                <div className="flex gap-1 bg-bg-app rounded-xl p-1">
                    {[
                        { key: 'licht', label: 'Licht', icon: Sun },
                        { key: 'systeem', label: 'Systeem', icon: Monitor },
                        { key: 'donker', label: 'Donker', icon: Moon },
                    ].map((item) => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.key}
                                onClick={() => setThema(item.key)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${thema === item.key
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                <Icon size={14} />
                                {item.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Acties */}
            <div className="card mb-4 divide-y divide-overlay/10">
                <button
                    onClick={() => { setToonPinWijzigen(true); setPinStap(1); setPinFout(''); setPinSucces(false) }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors text-left"
                >
                    <span className="text-primary"><Key size={18} /></span>
                    <div className="flex-1">
                        <p className="text-text-primary font-medium text-sm">Pincode wijzigen</p>
                    </div>
                    <ChevronRight size={16} className="text-text-muted" />
                </button>

                <button
                    onClick={handleUitloggen}
                    className="w-full flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors text-left"
                >
                    <LogOut size={18} className="text-error" />
                    <div className="flex-1">
                        <p className="text-error font-medium text-sm">Uitloggen</p>
                    </div>
                </button>
            </div>

            {/* Actiehistorie */}
            <div>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock size={14} /> Mijn activiteit
                </h2>

                {loading ? (
                    <LaadIndicator />
                ) : historie.length === 0 ? (
                    <div className="card p-6 text-center text-text-muted text-sm">
                        Nog geen activiteit geregistreerd
                    </div>
                ) : (
                    <div className="space-y-2">
                        {historie.map(t => (
                            <div key={t.id} className="card p-3 flex items-center gap-3">
                                {typeIcoon(t.type)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-text-primary text-sm font-medium truncate">{t.materiaal?.naam || 'Onbekend item'}</p>
                                    <p className="text-text-muted text-xs capitalize">
                                        {t.type === 'uitchecken' ? 'Meegenomen' :
                                            t.type === 'inchecken' ? `Teruggebracht${t.locatie ? ` (${t.locatie})` : ''}` :
                                                t.type === 'overrule' ? 'Overrule' : t.type}
                                    </p>
                                </div>
                                <p className="text-text-muted text-xs whitespace-nowrap">
                                    <DatumTijd tijdstip={t.tijdstip} compact />
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal pincode wijzigen */}
            {toonPinWijzigen && (
                <Modal title={pinSucces ? '✓ Pincode gewijzigd' : pinStap === 1 ? 'Huidige pincode' : 'Nieuwe pincode'} onClose={() => setToonPinWijzigen(false)}>
                    {pinSucces ? (
                        <p className="text-success text-center">Je pincode is succesvol gewijzigd!</p>
                    ) : pinStap === 1 ? (
                        <PincodeInvoer
                            label="Voer je huidige pincode in"
                            onBevestig={handleOudePin}
                            loading={pinLoading}
                            error={pinFout}
                        />
                    ) : (
                        <PincodeInvoer
                            label="Voer je nieuwe pincode in"
                            onBevestig={handleNieuwePin}
                            loading={pinLoading}
                            error={pinFout}
                        />
                    )}
                </Modal>
            )}
        </div>
    )
}
