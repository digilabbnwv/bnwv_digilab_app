import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, AlertTriangle, PlayCircle, CheckCircle2, Clock, TimerReset } from 'lucide-react'
import { getAllMeldingen } from '../lib/onderhoud'
import {
    telMeldingenPerType, telMeldingenPerStatus, telMeldingenPerMateriaal,
    gemOplostijd, gemMeldingDoorlooptijd, meldingenAchterstand, meldingLabel,
} from '../lib/rapportage'
import { ACHTERSTAND_DAGEN, meldingStatusLabel } from '../lib/meldingStatus'
import { MeldingStatusBadge } from '../components/MeldingStatus'
import { periodeVoorPreset } from '../components/rapportage/PeriodeFilter'
import RapportageWeergave from '../components/rapportage/RapportageWeergave'
import RapportGrafiek from '../components/rapportage/RapportGrafiek'
import RapportTabel from '../components/rapportage/RapportTabel'
import KpiTegel from '../components/rapportage/KpiTegel'

function datumKort(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function duurLabel(uren) {
    if (uren == null) return '—'
    if (uren >= 48) return `${Math.round(uren / 24)} d`
    return `${uren} u`
}

export default function RapportageOnderhoud() {
    const [periode, setPeriode] = useState(() => ({ ...periodeVoorPreset('jaar'), preset: 'jaar' }))
    const [loading, setLoading] = useState(true)
    const [alle, setAlle] = useState([])

    useEffect(() => {
        let actief = true
        getAllMeldingen()
            .then(m => { if (actief) setAlle(m) })
            .catch(console.error)
            .finally(() => { if (actief) setLoading(false) })
        return () => { actief = false }
    }, [])

    const meldingen = useMemo(() => {
        const totGrens = `${periode.tot}T23:59:59.999Z`
        return alle.filter(m => m.tijdstip_gemeld >= periode.van && m.tijdstip_gemeld <= totGrens)
    }, [alle, periode.van, periode.tot])

    const perType = useMemo(() => telMeldingenPerType(meldingen), [meldingen])
    const status = useMemo(() => telMeldingenPerStatus(meldingen), [meldingen])
    const perMateriaal = useMemo(() => telMeldingenPerMateriaal(meldingen), [meldingen])
    const oplostijd = useMemo(() => gemOplostijd(meldingen), [meldingen])
    const doorloop = useMemo(() => gemMeldingDoorlooptijd(meldingen), [meldingen])
    // Achterstand berekenen we op álle openstaande meldingen, niet alleen die in
    // de periode — een oude, blijven-hangen melding valt anders juist buiten beeld.
    const achterstand = useMemo(() => meldingenAchterstand(alle, ACHTERSTAND_DAGEN), [alle])

    const tabelRijen = useMemo(() => meldingen.map(m => ({
        materiaal: m.materiaal?.naam || '—',
        type: meldingLabel(m.type_melding),
        status: meldingStatusLabel(m.status),
        gemeld: datumKort(m.tijdstip_gemeld),
        afgerond: datumKort(m.tijdstip_opgelost),
    })), [meldingen])

    const kolommen = [
        { key: 'materiaal', label: 'Materiaal' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'gemeld', label: 'Gemeld' },
        { key: 'afgerond', label: 'Afgerond' },
    ]

    const kpis = (
        <>
            <KpiTegel label="Nieuw" waarde={status.nieuw} icon={AlertTriangle} hint="nog niet opgepakt" />
            <KpiTegel label="In behandeling" waarde={status.in_behandeling} icon={PlayCircle} hint="wordt opgepakt" />
            <KpiTegel label="Afgerond" waarde={status.afgerond} icon={CheckCircle2} hint="afgehandeld" />
            <KpiTegel label="Oplostijd" waarde={duurLabel(oplostijd)} icon={Clock} hint="gemiddeld totaal" />
        </>
    )

    const statusData = [
        { label: 'Nieuw', aantal: status.nieuw },
        { label: 'In behandeling', aantal: status.in_behandeling },
        { label: 'Afgerond', aantal: status.afgerond },
    ].filter(d => d.aantal > 0)

    const grafieken = [
        {
            titel: 'Achterstand (te lang open)',
            element: achterstand.length === 0 ? (
                <p className="text-sm text-text-muted flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-success" /> Geen achterstand — alles binnen de norm
                    ({ACHTERSTAND_DAGEN.nieuw}d nieuw · {ACHTERSTAND_DAGEN.in_behandeling}d in behandeling).
                </p>
            ) : (
                <div className="space-y-1.5">
                    {achterstand.map(a => (
                        <Link key={a.id} to={`/melding/${a.id}`}
                            className="flex items-center gap-2 p-2 rounded-lg bg-bg-app hover:bg-bg-hover transition-colors">
                            <AlertTriangle size={14} className="text-error flex-shrink-0" />
                            <span className="text-sm text-text-primary truncate flex-1">{a.materiaal}</span>
                            <MeldingStatusBadge status={a.status} />
                            <span className="text-xs font-medium text-error whitespace-nowrap">{a.dagen} d</span>
                        </Link>
                    ))}
                </div>
            ),
        },
        {
            titel: 'Meldingen per type',
            element: <RapportGrafiek type="pie" data={perType} xKey="label" />,
        },
        {
            titel: 'Meldingen per status',
            element: <RapportGrafiek type="bar" data={statusData} xKey="label" naamLabel="Meldingen" kleur="#7C3AED" />,
        },
        {
            titel: 'Gemiddelde doorlooptijd per fase',
            element: (
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-bg-app">
                        <div className="flex items-center gap-1.5 text-text-muted mb-1">
                            <TimerReset size={13} /><span className="text-xs">Gemeld → in behandeling</span>
                        </div>
                        <div className="text-xl font-bold text-text-primary">{duurLabel(doorloop.naarInBehandeling)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-app">
                        <div className="flex items-center gap-1.5 text-text-muted mb-1">
                            <TimerReset size={13} /><span className="text-xs">In behandeling → afgerond</span>
                        </div>
                        <div className="text-xl font-bold text-text-primary">{duurLabel(doorloop.naarAfgerond)}</div>
                    </div>
                </div>
            ),
        },
        {
            titel: 'Probleemmateriaal (meeste meldingen)',
            element: <RapportGrafiek type="bar" horizontaal data={perMateriaal.slice(0, 8).map(m => ({ label: m.naam, aantal: m.aantal }))} naamLabel="Meldingen" />,
        },
    ]

    return (
        <RapportageWeergave
            titel="Onderhoud"
            preset={periode.preset}
            onPeriodeChange={setPeriode}
            loading={loading}
            kpis={kpis}
            grafieken={grafieken}
            tabel={<RapportTabel titel="Meldingen" kolommen={kolommen} rijen={tabelRijen} bestandsnaam="onderhoud" />}
        />
    )
}
