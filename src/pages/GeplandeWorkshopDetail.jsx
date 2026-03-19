import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGeplandeWorkshop, updateGeplandeWorkshop, verwijderGeplandeWorkshop } from '../lib/geplandeWorkshops'
import { syncWorkshopAgenda } from '../lib/agendaSync'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LaadIndicator } from '../components/UI'
import { ArrowLeft, Save, Trash2, CalendarDays, MapPin, Clock, Users, Euro, CheckCircle2, Globe, Megaphone, Package, User } from 'lucide-react'

const statusKleuren = {
    concept: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    gepubliceerd: 'bg-success/20 text-success border-success/30',
    geannuleerd: 'bg-error/20 text-error border-error/30',
}

export default function GeplandeWorkshopDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { isBeheerder } = useAuth()
    const [workshop, setWorkshop] = useState(null)
    const [medewerkers, setMedewerkers] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        Promise.all([
            getGeplandeWorkshop(id),
            supabase.from('medewerkers').select('id, naam').order('naam'),
        ]).then(([workshopData, { data: medData }]) => {
            setWorkshop(workshopData)
            setMedewerkers(medData || [])
        })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [id])

    async function toggleCheckbox(veld) {
        if (!isBeheerder) return
        const nieuweWaarde = !workshop[veld]
        setSaving(true)
        try {
            await updateGeplandeWorkshop(id, { [veld]: nieuweWaarde })
            setWorkshop(w => ({ ...w, [veld]: nieuweWaarde }))
        } catch (err) {
            alert('Fout: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function wijzigUitvoerder(uitvoerderId) {
        if (!isBeheerder) return
        setSaving(true)
        try {
            const waarde = uitvoerderId || null
            await updateGeplandeWorkshop(id, { uitvoerder_id: waarde })
            const gevonden = medewerkers.find(m => m.id === waarde)
            setWorkshop(w => ({ ...w, uitvoerder_id: waarde, uitvoerder: gevonden ? { id: waarde, naam: gevonden.naam } : null }))
        } catch (err) {
            alert('Fout: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function wijzigStatus(nieuweStatus) {
        if (!isBeheerder) return
        setSaving(true)
        try {
            await updateGeplandeWorkshop(id, { status: nieuweStatus })
            const bijgewerkt = { ...workshop, status: nieuweStatus }
            setWorkshop(bijgewerkt)
            if (nieuweStatus === 'gepubliceerd') {
                await syncWorkshopAgenda(bijgewerkt, 'aanmaken')
            } else if (nieuweStatus === 'geannuleerd') {
                await syncWorkshopAgenda(bijgewerkt, 'annuleren')
            }
        } catch (err) {
            alert('Fout: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleVerwijder() {
        if (!confirm('Weet je zeker dat je deze geplande workshop wilt verwijderen?')) return
        try {
            await verwijderGeplandeWorkshop(id)
            navigate('/kalender')
        } catch (err) {
            alert('Fout bij verwijderen: ' + err.message)
        }
    }

    if (loading) return <div className="app-container pt-8"><LaadIndicator /></div>
    if (!workshop) return (
        <div className="app-container pt-8">
            <p className="text-text-muted text-center">Workshop niet gevonden</p>
        </div>
    )

    const datumObj = new Date(workshop.datum + 'T00:00:00')
    const datumFormatted = datumObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const heeftMateriaal = workshop.gekoppeld_materiaal || workshop.template?.materiaal_omschrijving

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button onClick={() => navigate('/kalender')} className="flex items-center gap-1 text-text-muted hover:text-text-primary mb-4 text-sm">
                <ArrowLeft size={16} /> Terug naar kalender
            </button>

            {/* Header */}
            <div className="card p-5 mb-4">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs text-primary font-medium">
                            {datumObj.toLocaleDateString('nl-NL', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-primary leading-tight">
                            {datumObj.getDate()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-text-primary">{workshop.titel}</h1>
                        <p className="text-sm text-text-muted capitalize">{datumFormatted}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusKleuren[workshop.status] || ''}`}>
                        {workshop.status === 'concept' ? 'Concept' : workshop.status === 'gepubliceerd' ? 'Gepubliceerd' : 'Geannuleerd'}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-bg-app rounded-lg p-3">
                        <p className="text-text-muted text-xs mb-1 flex items-center gap-1"><Clock size={11} /> Tijd</p>
                        <p className="text-text-primary">{workshop.start_tijd?.slice(0, 5)} – {workshop.eind_tijd?.slice(0, 5)}</p>
                    </div>
                    <div className="bg-bg-app rounded-lg p-3">
                        <p className="text-text-muted text-xs mb-1 flex items-center gap-1"><MapPin size={11} /> Locatie</p>
                        <p className="text-text-primary">{workshop.locatie}</p>
                    </div>
                    <div className="bg-bg-app rounded-lg p-3">
                        <p className="text-text-muted text-xs mb-1 flex items-center gap-1"><Users size={11} /> Deelnemers</p>
                        <p className="text-text-primary">max {workshop.max_deelnemers}</p>
                    </div>
                    <div className="bg-bg-app rounded-lg p-3">
                        <p className="text-text-muted text-xs mb-1 flex items-center gap-1"><Euro size={11} /> Kosten</p>
                        <p className="text-text-primary">{workshop.kosten ? `€ ${workshop.kosten}` : 'Gratis'}</p>
                    </div>
                </div>

                {workshop.doelgroep && (
                    <p className="text-sm text-text-muted mt-3">Doelgroep: {workshop.doelgroep}</p>
                )}
                {workshop.opmerkingen && (
                    <p className="text-sm text-text-muted mt-2 italic">{workshop.opmerkingen}</p>
                )}
            </div>

            {/* Materiaal */}
            {heeftMateriaal && (
                <div className="card p-5 mb-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Package size={14} /> Materiaal
                    </h2>
                    {workshop.gekoppeld_materiaal && (
                        <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2.5 mb-2">
                            <Package size={14} className="text-primary flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-primary">{workshop.gekoppeld_materiaal.naam}</p>
                                {workshop.gekoppeld_materiaal.type && (
                                    <p className="text-xs text-primary/60">{workshop.gekoppeld_materiaal.type}</p>
                                )}
                            </div>
                        </div>
                    )}
                    {workshop.template?.materiaal_omschrijving && (
                        <p className="text-sm text-text-secondary">
                            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Aanvullend: </span>
                            {workshop.template.materiaal_omschrijving}
                        </p>
                    )}
                </div>
            )}

            {/* Voortgang */}
            {isBeheerder && (
                <div className="card p-5 mb-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Voortgang</h2>

                    {/* Uitvoerder */}
                    <div className="mb-4">
                        <label className="text-xs text-text-muted font-medium uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                            <User size={12} /> Uitvoerder
                        </label>
                        <select
                            className="input"
                            value={workshop.uitvoerder_id || ''}
                            onChange={e => wijzigUitvoerder(e.target.value)}
                            disabled={saving}
                        >
                            <option value="">— Nog niet toegewezen —</option>
                            {medewerkers.map(m => (
                                <option key={m.id} value={m.id}>{m.naam}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => toggleCheckbox('ruimte_geregeld')}
                            disabled={saving}
                            className="flex items-center gap-3 w-full text-left"
                        >
                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${workshop.ruimte_geregeld ? 'bg-success border-success' : 'border-overlay/30'}`}>
                                {workshop.ruimte_geregeld && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                            <span className="text-sm text-text-primary">Ruimte geregeld</span>
                        </button>
                        <button
                            onClick={() => toggleCheckbox('in_jaarkalender')}
                            disabled={saving}
                            className="flex items-center gap-3 w-full text-left"
                        >
                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${workshop.in_jaarkalender ? 'bg-success border-success' : 'border-overlay/30'}`}>
                                {workshop.in_jaarkalender && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                            <span className="text-sm text-text-primary flex items-center gap-1.5">
                                <Megaphone size={14} className="text-text-muted" /> In jaarkalender
                            </span>
                        </button>
                        <button
                            onClick={() => toggleCheckbox('in_webshop')}
                            disabled={saving}
                            className="flex items-center gap-3 w-full text-left"
                        >
                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${workshop.in_webshop ? 'bg-success border-success' : 'border-overlay/30'}`}>
                                {workshop.in_webshop && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                            <span className="text-sm text-text-primary flex items-center gap-1.5">
                                <Globe size={14} className="text-text-muted" /> Gepubliceerd in webshop
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* Status acties */}
            {isBeheerder && (
                <div className="card p-5 mb-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Status wijzigen</h2>
                    <div className="flex gap-2 flex-wrap">
                        {workshop.status !== 'gepubliceerd' && (
                            <button
                                onClick={() => wijzigStatus('gepubliceerd')}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors text-sm font-medium flex items-center gap-1.5"
                            >
                                <Save size={14} /> Publiceren
                            </button>
                        )}
                        {workshop.status !== 'concept' && (
                            <button
                                onClick={() => wijzigStatus('concept')}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-medium"
                            >
                                Terug naar concept
                            </button>
                        )}
                        {workshop.status !== 'geannuleerd' && (
                            <button
                                onClick={() => wijzigStatus('geannuleerd')}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors text-sm font-medium"
                            >
                                Annuleren
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Verwijderen */}
            {isBeheerder && (
                <button
                    onClick={handleVerwijder}
                    className="w-full py-3 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                    <Trash2 size={16} /> Workshop verwijderen
                </button>
            )}
        </div>
    )
}
