import React, { useEffect, useMemo, useState } from 'react'
import { GraduationCap, CheckCircle2, FileText, Grid3x3 } from 'lucide-react'
import { getAllLesplannen, getLeerlijnMatrix } from '../lib/lesplannen'
import {
    telLesplannenPerStatus, telLesplannenPerThema, telLesplannenPerDoelgroep, berekenDekkingsgraad,
} from '../lib/rapportage'
import RapportageWeergave from '../components/rapportage/RapportageWeergave'
import RapportGrafiek from '../components/rapportage/RapportGrafiek'
import RapportTabel from '../components/rapportage/RapportTabel'
import KpiTegel from '../components/rapportage/KpiTegel'

export default function RapportageLesbrieven() {
    const [loading, setLoading] = useState(true)
    const [lesplannen, setLesplannen] = useState([])
    const [matrix, setMatrix] = useState(null)

    useEffect(() => {
        let actief = true
        Promise.all([getAllLesplannen(), getLeerlijnMatrix()])
            .then(([lp, m]) => {
                if (!actief) return
                setLesplannen(lp)
                setMatrix(m)
            })
            .catch(console.error)
            .finally(() => { if (actief) setLoading(false) })
        return () => { actief = false }
    }, [])

    const status = useMemo(() => telLesplannenPerStatus(lesplannen), [lesplannen])
    const perThema = useMemo(() => telLesplannenPerThema(lesplannen), [lesplannen])
    const perDoelgroep = useMemo(() => telLesplannenPerDoelgroep(lesplannen), [lesplannen])
    const dekking = useMemo(() => berekenDekkingsgraad(matrix), [matrix])

    const tabelRijen = useMemo(() => lesplannen.map(l => ({
        titel: l.titel,
        status: l.status === 'gepubliceerd' ? 'Gepubliceerd' : 'Concept',
        themas: (l.themas || []).map(t => t.naam).join(', ') || '—',
        doelgroepen: (l.doelgroepen || []).map(d => d.naam).join(', ') || '—',
    })), [lesplannen])

    const kolommen = [
        { key: 'titel', label: 'Lesbrief' },
        { key: 'status', label: 'Status' },
        { key: 'themas', label: "Thema's" },
        { key: 'doelgroepen', label: 'Doelgroepen' },
    ]

    const kpis = (
        <>
            <KpiTegel label="Lesbrieven" waarde={lesplannen.length} icon={GraduationCap} />
            <KpiTegel label="Gepubliceerd" waarde={status.gepubliceerd} icon={CheckCircle2} />
            <KpiTegel label="Concept" waarde={status.concept} icon={FileText} />
            <KpiTegel label="Dekkingsgraad" waarde={`${dekking.percentage}%`} icon={Grid3x3} hint={`${dekking.gedekt}/${dekking.totaal} cellen`} />
        </>
    )

    const grafieken = [
        {
            titel: "Lesbrieven per thema",
            element: <RapportGrafiek type="bar" data={perThema.map(t => ({ label: t.naam, aantal: t.aantal }))} xKey="label" naamLabel="Lesbrieven" />,
        },
        {
            titel: 'Per status',
            element: <RapportGrafiek type="pie" data={[{ label: 'Gepubliceerd', aantal: status.gepubliceerd }, { label: 'Concept', aantal: status.concept }].filter(d => d.aantal > 0)} xKey="label" />,
        },
        {
            titel: 'Per doelgroep',
            element: <RapportGrafiek type="bar" horizontaal data={perDoelgroep.map(d => ({ label: d.naam, aantal: d.aantal }))} naamLabel="Lesbrieven" kleur="#7C3AED" />,
        },
    ]

    return (
        <RapportageWeergave
            titel="Lesbrieven & Leerlijn"
            toonPeriode={false}
            loading={loading}
            kpis={kpis}
            grafieken={grafieken}
            tabel={<RapportTabel titel="Lesbrieven" kolommen={kolommen} rijen={tabelRijen} bestandsnaam="lesbrieven" />}
        />
    )
}
