import React, { useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, FileText, XCircle } from 'lucide-react'
import { getGeplandeWorkshopsVoorPeriode } from '../lib/geplandeWorkshops'
import { telWorkshopsPerStatus, telWorkshopsPer, trendPerPeriode } from '../lib/rapportage'
import { periodeVoorPreset } from '../components/rapportage/PeriodeFilter'
import RapportageWeergave from '../components/rapportage/RapportageWeergave'
import RapportGrafiek from '../components/rapportage/RapportGrafiek'
import RapportTabel from '../components/rapportage/RapportTabel'
import KpiTegel from '../components/rapportage/KpiTegel'

const STATUS_LABELS = { concept: 'Concept', gepubliceerd: 'Gepubliceerd', geannuleerd: 'Geannuleerd' }

function datumKort(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function RapportageWorkshops() {
    // Vooruitkijkend: periode t/m einde (totEinde) zodat aankomende workshops meetellen.
    const [periode, setPeriode] = useState(() => ({ ...periodeVoorPreset('jaar', true), preset: 'jaar' }))
    const [loading, setLoading] = useState(true)
    const [workshops, setWorkshops] = useState([])

    useEffect(() => {
        let actief = true
        getGeplandeWorkshopsVoorPeriode(periode.van, periode.tot)
            .then(w => { if (actief) setWorkshops(w) })
            .catch(console.error)
            .finally(() => { if (actief) setLoading(false) })
        return () => { actief = false }
    }, [periode.van, periode.tot])

    const eenheid = periode.preset === 'week' ? 'week' : 'maand'
    const status = useMemo(() => telWorkshopsPerStatus(workshops), [workshops])
    const perLocatie = useMemo(() => telWorkshopsPer(workshops, 'locatie'), [workshops])
    const perDoelgroep = useMemo(() => telWorkshopsPer(workshops, 'doelgroep'), [workshops])
    const trend = useMemo(() => trendPerPeriode(workshops, eenheid, 'datum'), [workshops, eenheid])

    const tabelRijen = useMemo(() => workshops.map(w => ({
        datum: datumKort(w.datum),
        titel: w.titel || '—',
        locatie: w.locatie || '—',
        doelgroep: w.doelgroep || '—',
        status: STATUS_LABELS[w.status] || w.status,
    })), [workshops])

    const kolommen = [
        { key: 'datum', label: 'Datum' },
        { key: 'titel', label: 'Workshop' },
        { key: 'locatie', label: 'Locatie' },
        { key: 'doelgroep', label: 'Doelgroep' },
        { key: 'status', label: 'Status' },
    ]

    const kpis = (
        <>
            <KpiTegel label="Gepland" waarde={workshops.length} icon={BookOpen} hint="in periode" />
            <KpiTegel label="Gepubliceerd" waarde={status.gepubliceerd} icon={CheckCircle2} />
            <KpiTegel label="Concept" waarde={status.concept} icon={FileText} />
            <KpiTegel label="Geannuleerd" waarde={status.geannuleerd} icon={XCircle} />
        </>
    )

    const grafieken = [
        {
            titel: `Workshops per ${eenheid}`,
            element: <RapportGrafiek type="line" data={trend} xKey="label" naamLabel="Workshops" />,
        },
        {
            titel: 'Per locatie',
            element: <RapportGrafiek type="pie" data={perLocatie} xKey="sleutel" yKey="aantal" />,
        },
        {
            titel: 'Per doelgroep',
            element: <RapportGrafiek type="bar" horizontaal data={perDoelgroep.map(d => ({ label: d.sleutel, aantal: d.aantal }))} naamLabel="Workshops" kleur="#7C3AED" />,
        },
    ]

    return (
        <RapportageWeergave
            titel="Workshops"
            preset={periode.preset}
            onPeriodeChange={setPeriode}
            totEinde
            loading={loading}
            kpis={kpis}
            grafieken={grafieken}
            tabel={<RapportTabel titel="Geplande workshops" kolommen={kolommen} rijen={tabelRijen} bestandsnaam="workshops" />}
        />
    )
}
