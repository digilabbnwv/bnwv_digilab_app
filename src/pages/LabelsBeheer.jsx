import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllLabels, addLabel, updateLabel, deleteLabel } from '../lib/labels'
import { LaadIndicator } from '../components/UI'
import Modal from '../components/Modal'
import { ArrowLeft, Tag, Plus, Pencil, Trash2 } from 'lucide-react'

const KLEUR_OPTIES = ['#E8772E', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#64748B']

export default function LabelsBeheer() {
    const navigate = useNavigate()
    const [labels, setLabels] = useState([])
    const [loading, setLoading] = useState(true)
    const [fout, setFout] = useState('')

    const [bewerkLabel, setBewerkLabel] = useState(null) // null = geen modal, {} = nieuw, {id,...} = bewerken
    const [naam, setNaam] = useState('')
    const [kleur, setKleur] = useState(KLEUR_OPTIES[0])
    const [opslaan, setOpslaan] = useState(false)
    const [verwijderen, setVerwijderen] = useState(null) // label dat bevestigd moet worden

    const laadLabels = () => {
        setLoading(true)
        getAllLabels()
            .then(setLabels)
            .catch(err => setFout(err.message || 'Laden mislukt'))
            .finally(() => setLoading(false))
    }

    useEffect(laadLabels, [])

    const openNieuw = () => {
        setBewerkLabel({})
        setNaam('')
        setKleur(KLEUR_OPTIES[0])
        setFout('')
    }

    const openBewerken = (label) => {
        setBewerkLabel(label)
        setNaam(label.naam)
        setKleur(label.kleur || KLEUR_OPTIES[0])
        setFout('')
    }

    const handleOpslaan = async () => {
        if (!naam.trim()) return setFout('Naam is verplicht')
        setOpslaan(true)
        setFout('')
        try {
            if (bewerkLabel?.id) {
                await updateLabel(bewerkLabel.id, { naam: naam.trim(), kleur })
            } else {
                await addLabel({ naam: naam.trim(), kleur })
            }
            setBewerkLabel(null)
            laadLabels()
        } catch (err) {
            setFout(err.message || 'Opslaan mislukt')
        } finally {
            setOpslaan(false)
        }
    }

    const handleVerwijderen = async () => {
        if (!verwijderen) return
        setOpslaan(true)
        try {
            await deleteLabel(verwijderen.id)
            setVerwijderen(null)
            laadLabels()
        } catch (err) {
            setFout(err.message || 'Verwijderen mislukt')
        } finally {
            setOpslaan(false)
        }
    }

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary transition-colors">
                <ArrowLeft size={18} /> Terug
            </button>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-end flex items-center justify-center shadow-lg shadow-accent/30">
                        <Tag size={18} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary">Labels beheren</h1>
                </div>
                <button onClick={openNieuw} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                    <Plus size={16} /> Nieuw
                </button>
            </div>

            {fout && !bewerkLabel && !verwijderen && (
                <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm mb-4">
                    {fout}
                </div>
            )}

            {loading ? (
                <LaadIndicator />
            ) : labels.length === 0 ? (
                <div className="card p-8 text-center">
                    <Tag size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Nog geen labels aangemaakt</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {labels.map(label => (
                        <div key={label.id} className="card flex items-center gap-3 p-4">
                            <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: label.kleur || '#64748B' }}
                            />
                            <p className="flex-1 font-medium text-text-primary truncate">{label.naam}</p>
                            <button
                                onClick={() => openBewerken(label)}
                                className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
                                aria-label={`${label.naam} bewerken`}
                            >
                                <Pencil size={16} />
                            </button>
                            <button
                                onClick={() => setVerwijderen(label)}
                                className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                                aria-label={`${label.naam} verwijderen`}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Aanmaken / bewerken */}
            {bewerkLabel && (
                <Modal title={bewerkLabel.id ? 'Label bewerken' : 'Nieuw label'} onClose={() => setBewerkLabel(null)}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">Naam *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Bijv. Digitaal"
                                value={naam}
                                onChange={e => setNaam(e.target.value)}
                                disabled={opslaan}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">Kleur</label>
                            <div className="flex gap-2 flex-wrap">
                                {KLEUR_OPTIES.map(k => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setKleur(k)}
                                        className={`w-8 h-8 rounded-full transition-all ${kleur === k ? 'ring-2 ring-offset-2 ring-offset-bg-surface ring-primary' : ''}`}
                                        style={{ backgroundColor: k }}
                                        aria-label={k}
                                    />
                                ))}
                            </div>
                        </div>
                        {fout && (
                            <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                                {fout}
                            </div>
                        )}
                        <button onClick={handleOpslaan} className="btn-primary w-full" disabled={opslaan}>
                            {opslaan
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                : 'Opslaan'
                            }
                        </button>
                    </div>
                </Modal>
            )}

            {/* Verwijderen bevestigen */}
            {verwijderen && (
                <Modal title="Label verwijderen" onClose={() => setVerwijderen(null)} size="sm">
                    <div className="space-y-4">
                        <p className="text-text-secondary text-sm">
                            Weet je zeker dat je het label <span className="font-semibold text-text-primary">{verwijderen.naam}</span> wilt verwijderen?
                            Het wordt losgekoppeld van alle materiaal.
                        </p>
                        {fout && (
                            <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                                {fout}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setVerwijderen(null)} className="btn-ghost flex-1" disabled={opslaan}>
                                Annuleren
                            </button>
                            <button onClick={handleVerwijderen} className="flex-1 rounded-xl bg-error text-white font-medium py-2.5 hover:bg-error/90 transition-colors disabled:opacity-50" disabled={opslaan}>
                                {opslaan
                                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                    : 'Verwijderen'
                                }
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
