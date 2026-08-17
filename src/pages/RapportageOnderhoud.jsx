import React, { useEffect, useMemo, useState } from 'react'
import { Wrench, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { getAllMeldingen } from '../lib/onderhoud'
import {
    telMeldingenPerType, telMeldingenPerStatus, telMeldingenPerMateriaal, gemOplostijd, meldingLabel,
} from '../lib/rapportage'
import { periodeVoorPreset } from '../components/rapportage/PeriodeFilter'
import RapportageWeergave from '../components/rapportage/RapportageWeergave'
import RapportGrafiek from '../components/rapportage/RapportGrafiek'
import RapportTabel from '../components/rapportage/RapportTabel'
import KpiTegel from '../components/rapportage/KpiTegel'

function datumKort(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function oplostijdLabel(uren) {
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

    const tabelRijen = useMemo(() => meldingen.map(m => ({
        materiaal: m.materiaal?.naam || '—',
        type: meldingLabel(m.type_melding),
        status: m.status === 'opgelost' ? 'Opgelost' : 'Open',
        gemeld: datumKort(m.tijdstip_gemeld),
        opgelost: datumKort(m.tijdstip_opgelost),
    })), [meldingen])

    const kolommen = [
        { key: 'materiaal', label: 'Materiaal' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'gemeld', label: 'Gemeld' },
        { key: 'opgelost', label: 'Opgelost' },
    ]

    const kpis = (
        <>
            <KpiTegel label="Meldingen" waarde={meldingen.length} icon={Wrench} hint="in periode" />
            <KpiTegel label="Open" waarde={status.open} icon={AlertTriangle} hint="nog niet opgelost" />
            <KpiTegel label="Opgelost" waarde={status.opgelost} icon={CheckCircle2} hint="afgehandeld" />
            <KpiTegel label="Oplostijd" waarde={oplostijdLabel(oplostijd)} icon={Clock} hint="gemiddeld" />
        </>
    )

    const grafieken = [
        {
            titel: 'Meldingen per type',
            element: <RapportGrafiek type="pie" data={perType} xKey="label" />,
        },
        {
            titel: 'Open vs. opgelost',
            element: <RapportGrafiek type="bar" data={[{ label: 'Open', aantal: status.open }, { label: 'Opgelost', aantal: status.opgelost }].filter(d => d.aantal > 0)} xKey="label" naamLabel="Meldingen" kleur="#7C3AED" />,
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
