import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getMelding } from '../lib/onderhoud'
import { LaadIndicator, DatumTijd } from '../components/UI'
import { MeldingStatusBadge, MeldingStatusControl } from '../components/MeldingStatus'
import {
    ArrowLeft, Wrench, User, Clock, Package, ChevronRight, CheckCircle2, PlayCircle, AlertTriangle,
} from 'lucide-react'

const TYPE_LABELS = {
    kapot: { label: 'Kapot', icon: '🔧' },
    mist: { label: 'Mist onderdeel', icon: '🔍' },
    verbruiksmateriaal: { label: 'Verbruiksmateriaal', icon: '🔋' },
    anders: { label: 'Anders', icon: '💬' },
}

function TijdlijnStap({ icon: Icon, label, tijdstip, actief, kleur }) {
    return (
        <div className={`flex items-start gap-3 ${actief ? '' : 'opacity-40'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${actief ? kleur : 'bg-bg-app'}`}>
                {Icon && <Icon size={15} className={actief ? 'text-white' : 'text-text-muted'} />}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{label}</p>
                {actief && tijdstip
                    ? <p className="text-xs text-text-muted"><DatumTijd tijdstip={tijdstip} /></p>
                    : <p className="text-xs text-text-muted">—</p>}
            </div>
        </div>
    )
}

export default function MeldingDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [melding, setMelding] = useState(null)
    const [loading, setLoading] = useState(true)
    const [nietGevonden, setNietGevonden] = useState(false)

    const laad = async () => {
        setLoading(true)
        try {
            const data = await getMelding(id)
            setMelding(data)
            setNietGevonden(!data)
        } catch (err) {
            console.error(err)
            setNietGevonden(true)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { laad() }, [id])

    if (loading) {
        return <div className="app-container pt-8"><LaadIndicator /></div>
    }

    if (nietGevonden || !melding) {
        return (
            <div className="app-container pt-8 pb-4">
                <button onClick={() => navigate('/melding')} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary transition-colors">
                    <ArrowLeft size={18} /> Naar meldingen
                </button>
                <div className="card p-10 text-center">
                    <AlertTriangle size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Deze melding bestaat niet (meer).</p>
                </div>
            </div>
        )
    }

    const typeInfo = TYPE_LABELS[melding.type_melding] || { label: melding.type_melding, icon: '❓' }

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button onClick={() => navigate('/melding')} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary transition-colors">
                <ArrowLeft size={18} /> Naar meldingen
            </button>

            {/* Kop */}
            <div className="flex items-start gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-bg-app flex items-center justify-center flex-shrink-0 text-xl">
                    {typeInfo.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold text-text-primary truncate">{melding.materiaal?.naam || 'Onbekend item'}</h1>
                        <MeldingStatusBadge status={melding.status} />
                    </div>
                    <p className="text-text-muted text-sm mt-0.5">{typeInfo.label}</p>
                </div>
            </div>

            {/* Status wijzigen */}
            <div className="card p-4 mb-4">
                <p className="text-text-secondary text-sm font-medium mb-3">Status</p>
                <MeldingStatusControl melding={melding} onGewijzigd={laad} />
            </div>

            {/* Toelichting */}
            {melding.toelichting && (
                <div className="card p-4 mb-4">
                    <p className="text-text-secondary text-sm font-medium mb-1.5">Toelichting</p>
                    <p className="text-text-primary text-sm whitespace-pre-wrap">{melding.toelichting}</p>
                </div>
            )}

            {/* Foto */}
            {melding.foto_url && (
                <div className="card p-4 mb-4">
                    <p className="text-text-secondary text-sm font-medium mb-3">Foto</p>
                    <img src={melding.foto_url} alt="Foto bij melding" className="w-full max-h-80 object-contain rounded-xl bg-bg-app" />
                </div>
            )}

            {/* Tijdlijn */}
            <div className="card p-4 mb-4">
                <p className="text-text-secondary text-sm font-medium mb-4">Verloop</p>
                <div className="space-y-4">
                    <TijdlijnStap icon={AlertTriangle} label="Gemeld" tijdstip={melding.tijdstip_gemeld} actief kleur="bg-error" />
                    <TijdlijnStap icon={PlayCircle} label="In behandeling genomen" tijdstip={melding.tijdstip_in_behandeling}
                        actief={melding.status === 'in_behandeling' || melding.status === 'afgerond'} kleur="bg-amber-400" />
                    <TijdlijnStap icon={CheckCircle2} label="Afgerond" tijdstip={melding.tijdstip_opgelost}
                        actief={melding.status === 'afgerond'} kleur="bg-success" />
                </div>
            </div>

            {/* Meta */}
            <div className="card p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <User size={14} className="text-text-muted" />
                    Gemeld door <strong className="text-text-primary">{melding.gemeld_door_medewerker?.naam || '—'}</strong>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Clock size={14} className="text-text-muted" />
                    <DatumTijd tijdstip={melding.tijdstip_gemeld} />
                </div>
                {melding.status === 'afgerond' && melding.opgelost_door_medewerker && (
                    <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 size={14} />
                        Afgerond door {melding.opgelost_door_medewerker.naam}
                    </div>
                )}
            </div>

            {/* Naar materiaal */}
            {melding.materiaal?.qr_code && (
                <Link to={`/item/${melding.materiaal.qr_code}`}
                    className="card p-4 flex items-center gap-3 hover:bg-bg-hover transition-colors">
                    <Package size={18} className="text-text-muted" />
                    <span className="text-sm text-text-secondary flex-1">Bekijk materiaal: <strong className="text-text-primary">{melding.materiaal.naam}</strong></span>
                    <ChevronRight size={16} className="text-text-muted" />
                </Link>
            )}
        </div>
    )
}
