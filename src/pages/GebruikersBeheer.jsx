import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { foutTekst } from '../lib/foutmelding'
import {
    getAlleMedewerkers, maakMedewerker, updateMedewerker,
    archiveerMedewerker, herstelMedewerker, resetPincode,
} from '../lib/medewerkers'
import { LaadIndicator } from '../components/UI'
import Modal from '../components/Modal'
import BevestigModal from '../components/BevestigModal'
import {
    UserPlus, Pencil, Key, Archive, ArchiveRestore,
    ShieldCheck, User, Users,
} from 'lucide-react'

function initialen(naam) {
    if (!naam) return '?'
    return naam.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const LEGE_FORM = { naam: '', email: '', rol: 'medewerker', pincode: '' }

export default function GebruikersBeheer() {
    const { medewerker } = useAuth()
    const toast = useToast()

    const [medewerkers, setMedewerkers] = useState([])
    const [loading, setLoading] = useState(true)
    const [toonGearchiveerd, setToonGearchiveerd] = useState(false)

    // Aanmaken/bewerken modal. bewerkId=null → nieuw, anders → bestaande gebruiker.
    const [toonForm, setToonForm] = useState(false)
    const [bewerkId, setBewerkId] = useState(null)
    const [form, setForm] = useState(LEGE_FORM)
    const [formLoading, setFormLoading] = useState(false)
    const [formFout, setFormFout] = useState('')

    // Archiveer/herstel-bevestiging
    const [archiveerDoel, setArchiveerDoel] = useState(null)
    const [archiveerBezig, setArchiveerBezig] = useState(false)

    // Pincode resetten
    const [pinDoel, setPinDoel] = useState(null)
    const [pinWaarde, setPinWaarde] = useState('')
    const [pinLoading, setPinLoading] = useState(false)
    const [pinFout, setPinFout] = useState('')
    const [pinSucces, setPinSucces] = useState(false)

    const laad = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getAlleMedewerkers({ inclusiefGearchiveerd: toonGearchiveerd })
            setMedewerkers(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [toonGearchiveerd])

    useEffect(() => { laad() }, [laad])

    // ── Aanmaken / bewerken ──────────────────────────────────────
    const openNieuw = () => {
        setBewerkId(null)
        setForm(LEGE_FORM)
        setFormFout('')
        setToonForm(true)
    }

    const openBewerk = (m) => {
        setBewerkId(m.id)
        setForm({ naam: m.naam, email: m.email, rol: m.rol, pincode: '' })
        setFormFout('')
        setToonForm(true)
    }

    const sluitForm = () => {
        setToonForm(false)
        setBewerkId(null)
        setFormFout('')
    }

    const isEigen = bewerkId === medewerker.id

    const handleFormOpslaan = async () => {
        const naam = form.naam.trim()
        const email = form.email.trim()
        if (!naam) return setFormFout('Vul een naam in')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormFout('Vul een geldig e-mailadres in')
        if (!bewerkId && form.pincode.length !== 5) return setFormFout('De pincode moet 5 cijfers zijn')

        setFormLoading(true); setFormFout('')
        try {
            if (bewerkId) {
                // Eigen beheerdersrol niet kunnen intrekken (voorkomt buitensluiten).
                const rol = isEigen ? 'beheerder' : form.rol
                await updateMedewerker(bewerkId, { naam, email, rol })
                toast.succes('Gebruiker bijgewerkt')
            } else {
                await maakMedewerker({ naam, email, rol: form.rol, pincode: form.pincode })
                toast.succes('Gebruiker aangemaakt')
            }
            sluitForm()
            await laad()
        } catch (err) {
            setFormFout(foutTekst(err, 'Opslaan mislukt — probeer het opnieuw.'))
        } finally {
            setFormLoading(false)
        }
    }

    // ── Archiveren / herstellen ──────────────────────────────────
    const bevestigArchiveer = async () => {
        if (!archiveerDoel) return
        setArchiveerBezig(true)
        try {
            if (archiveerDoel.gearchiveerd) {
                await herstelMedewerker(archiveerDoel.id)
                toast.succes('Gebruiker hersteld')
            } else {
                await archiveerMedewerker(archiveerDoel.id)
                toast.succes('Gebruiker gearchiveerd')
            }
            setArchiveerDoel(null)
            await laad()
        } catch (err) {
            toast.fout(foutTekst(err, 'Actie mislukt — probeer het opnieuw.'))
        } finally {
            setArchiveerBezig(false)
        }
    }

    // ── Pincode resetten ─────────────────────────────────────────
    const openPinReset = (m) => {
        setPinDoel(m)
        setPinWaarde('')
        setPinFout('')
        setPinSucces(false)
    }

    const handlePinReset = async () => {
        if (pinWaarde.length !== 5) return setPinFout('De pincode moet 5 cijfers zijn')
        setPinLoading(true); setPinFout('')
        try {
            await resetPincode(pinDoel.id, pinWaarde)
            setPinSucces(true)
            setTimeout(() => setPinDoel(null), 1800)
        } catch (err) {
            setPinFout(foutTekst(err, 'Pincode resetten mislukt.'))
        } finally {
            setPinLoading(false)
        }
    }

    const aantalActief = medewerkers.filter(m => !m.gearchiveerd).length

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Users size={22} className="text-primary" /> Gebruikers
                    </h1>
                    <p className="text-text-muted text-sm mt-0.5">{aantalActief} actieve gebruiker{aantalActief !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={openNieuw} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                    <UserPlus size={16} /> Nieuw
                </button>
            </div>

            {/* Filter */}
            <label className="flex items-center gap-2 mb-4 text-sm text-text-secondary cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={toonGearchiveerd}
                    onChange={e => setToonGearchiveerd(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                />
                Toon gearchiveerde gebruikers
            </label>

            {loading ? (
                <LaadIndicator />
            ) : medewerkers.length === 0 ? (
                <div className="card p-8 text-center">
                    <Users size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Geen gebruikers gevonden</p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2">
                    {medewerkers.map(m => {
                        const eigen = m.id === medewerker.id
                        const isBeheerderRol = m.rol === 'beheerder'
                        return (
                            <div key={m.id} className={`card p-4 ${m.gearchiveerd ? 'opacity-60' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-end flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md shadow-primary/20">
                                        {initialen(m.naam)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="font-semibold text-text-primary truncate">{m.naam}</p>
                                            {eigen && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-bg-hover text-text-muted">jij</span>}
                                        </div>
                                        <p className="text-xs text-text-muted truncate">{m.email}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${isBeheerderRol ? 'bg-primary/15 text-primary' : 'bg-bg-hover text-text-muted'}`}>
                                                {isBeheerderRol ? <ShieldCheck size={11} /> : <User size={11} />}
                                                {isBeheerderRol ? 'Beheerder' : 'Medewerker'}
                                            </span>
                                            {m.gearchiveerd && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-error/15 text-error">
                                                    Gearchiveerd
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Acties */}
                                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-overlay/10">
                                    <button
                                        onClick={() => openBewerk(m)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                                    >
                                        <Pencil size={14} /> Bewerken
                                    </button>
                                    <button
                                        onClick={() => openPinReset(m)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                                    >
                                        <Key size={14} /> Pincode
                                    </button>
                                    <div className="flex-1" />
                                    {eigen ? (
                                        <span className="text-[11px] text-text-muted px-2" title="Je kunt je eigen account niet archiveren">—</span>
                                    ) : m.gearchiveerd ? (
                                        <button
                                            onClick={() => setArchiveerDoel(m)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-success hover:bg-success/10 transition-colors"
                                        >
                                            <ArchiveRestore size={14} /> Herstellen
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setArchiveerDoel(m)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                                        >
                                            <Archive size={14} /> Archiveren
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Aanmaken / bewerken modal */}
            {toonForm && (
                <Modal title={bewerkId ? 'Gebruiker bewerken' : 'Nieuwe gebruiker'} onClose={sluitForm} sluitBijBackdrop={false}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">Naam *</label>
                            <input
                                type="text"
                                className="input"
                                value={form.naam}
                                onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">E-mailadres *</label>
                            <input
                                type="email"
                                className="input"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="naam@bibliotheeknwveluwe.nl"
                            />
                        </div>
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">Rol</label>
                            <select
                                className="input"
                                value={isEigen ? 'beheerder' : form.rol}
                                disabled={isEigen}
                                onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                            >
                                <option value="medewerker">Medewerker</option>
                                <option value="beheerder">Beheerder</option>
                            </select>
                            {isEigen && (
                                <p className="text-[11px] text-text-muted mt-1">Je kunt je eigen beheerdersrol niet intrekken.</p>
                            )}
                        </div>
                        {!bewerkId && (
                            <div>
                                <label className="block text-text-secondary text-sm font-medium mb-2">Pincode (5 cijfers) *</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]{5}"
                                    maxLength={5}
                                    className="input tracking-[0.5em] font-mono"
                                    value={form.pincode}
                                    onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                                    placeholder="•••••"
                                />
                                <p className="text-[11px] text-text-muted mt-1">De gebruiker logt in met e-mailadres + deze pincode.</p>
                            </div>
                        )}

                        {formFout && (
                            <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                                {formFout}
                            </div>
                        )}

                        <button
                            onClick={handleFormOpslaan}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                            disabled={formLoading}
                        >
                            {formLoading
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : (bewerkId ? 'Wijzigingen opslaan' : 'Gebruiker aanmaken')}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Pincode reset modal */}
            {pinDoel && (
                <Modal title={pinSucces ? '✓ Pincode gereset' : `Pincode resetten`} onClose={() => setPinDoel(null)} size="sm">
                    {pinSucces ? (
                        <p className="text-success text-center py-2">
                            De pincode van <strong>{pinDoel.naam}</strong> is gewijzigd.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-text-secondary text-sm">
                                Stel een nieuwe pincode in voor <strong className="text-text-primary">{pinDoel.naam}</strong>. Deel deze veilig met de gebruiker; die kan hem later zelf wijzigen.
                            </p>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{5}"
                                maxLength={5}
                                className="input tracking-[0.5em] font-mono text-center"
                                value={pinWaarde}
                                onChange={e => setPinWaarde(e.target.value.replace(/\D/g, '').slice(0, 5))}
                                placeholder="•••••"
                                autoFocus
                            />
                            {pinFout && (
                                <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                                    {pinFout}
                                </div>
                            )}
                            <button
                                onClick={handlePinReset}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                                disabled={pinLoading}
                            >
                                {pinLoading
                                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : <><Key size={16} /> Pincode instellen</>}
                            </button>
                        </div>
                    )}
                </Modal>
            )}

            {/* Archiveer/herstel bevestiging */}
            {archiveerDoel && (
                <BevestigModal
                    titel={archiveerDoel.gearchiveerd ? 'Gebruiker herstellen' : 'Gebruiker archiveren'}
                    bericht={archiveerDoel.gearchiveerd
                        ? <>Wil je <strong className="text-text-primary">{archiveerDoel.naam}</strong> weer activeren? De gebruiker kan daarna weer inloggen.</>
                        : <>Wil je <strong className="text-text-primary">{archiveerDoel.naam}</strong> archiveren? De gebruiker kan dan <strong>niet meer inloggen</strong> en verdwijnt uit keuzelijsten. Bestaande historie blijft behouden.</>
                    }
                    bevestigLabel={archiveerDoel.gearchiveerd ? 'Ja, herstellen' : 'Ja, archiveren'}
                    annuleerLabel="Annuleren"
                    gevaarlijk={!archiveerDoel.gearchiveerd}
                    loading={archiveerBezig}
                    onBevestig={bevestigArchiveer}
                    onAnnuleer={() => setArchiveerDoel(null)}
                />
            )}
        </div>
    )
}
