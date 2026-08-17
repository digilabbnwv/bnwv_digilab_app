import React, { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, XCircle, Clock, Activity } from 'lucide-react'
import { getAlleReserveringen } from '../lib/reserveringen'
import {
    getReserveringenInPeriode, getTransactiesInPeriode,
    telPerStatus, telPerMedewerker, trendPerPeriode, gemDoorlooptijd,
} from '../lib/rapportage'
import { periodeVoorPreset } from '../components/rapportage/PeriodeFilter'
import RapportageWeergave from '../components/rapportage/RapportageWeergave'
import RapportGrafiek from '../components/rapportage/RapportGrafiek'
import RapportTabel from '../components/rapportage/RapportTabel'
import KpiTegel from '../components/rapportage/KpiTegel'

const STATUS_LABELS = {
    actief: 'Gereserveerd',
    opgehaald: 'Opgehaald',
    teruggebracht: 'Teruggebracht',
    geannuleerd: 'Geannuleerd',
}

function datumKort(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default function RapportageReserveringen() {
    const [periode, setPeriode] = useState(() => ({ ...periodeVoorPreset('maand'), preset: 'maand' }))
    const [loading, setLoading] = useState(true)
    const [reserveringen, setReserveringen] = useState([])
    const [transacties, setTransacties] = useState([])
    const [lopendNu, setLopendNu] = useState(0)

    useEffect(() => {
        let actief = true
        Promise.all([
            getReserveringenInPeriode(periode.van, periode.tot),
            getTransactiesInPeriode(periode.van, periode.tot),
            getAlleReserveringen(),
        ])
            .then(([res, tx, lopend]) => {
                if (!actief) return
                setReserveringen(res)
                setTransacties(tx)
                setLopendNu(lopend.length)
            })
            .catch(console.error)
            .finally(() => { if (actief) setLoading(false) })
        return () => { actief = false }
    }, [periode.van, periode.tot])

    const eenheid = periode.preset === 'jaar' ? 'maand' : 'week'
    const status = useMemo(() => telPerStatus(reserveringen), [reserveringen])
    const perMedewerker = useMemo(() => telPerMedewerker(reserveringen), [reserveringen])
    const trend = useMemo(() => trendPerPeriode(reserveringen, eenheid), [reserveringen, eenheid])
    const doorlooptijd = useMemo(() => gemDoorlooptijd(reserveringen, transacties), [reserveringen, transacties])

    const totaal = reserveringen.length
    const percGeannuleerd = totaal > 0 ? Math.round((status.geannuleerd / totaal) * 100) : 0

    const statusData = [
        { label: 'Gereserveerd', aantal: status.actief },
        { label: 'Opgehaald', aantal: status.opgehaald },
        { label: 'Geannuleerd', aantal: status.geannuleerd },
    ].filter(d => d.aantal > 0)

    const tabelRijen = useMemo(() => (
        reserveringen.map(r => ({
            materiaal: r.materiaal?.naam || '—',
            medewerker: r.medewerker?.naam || '—',
            status: STATUS_LABELS[r.status] || r.status,
            periode: `${datumKort(r.van_datum)} – ${datumKort(r.tot_datum)}`,
            aangemaakt: datumKort(r.aangemaakt_op),
        }))
    ), [reserveringen])

    const kolommen = [
        { key: 'materiaal', label: 'Materiaal' },
        { key: 'medewerker', label: 'Medewerker' },
        { key: 'status', label: 'Status' },
        { key: 'periode', label: 'Periode' },
        { key: 'aangemaakt', label: 'Aangemaakt' },
    ]

    const kpis = (
        <>
            <KpiTegel label="Reserveringen" waarde={totaal} icon={CalendarCheck} hint="in periode" />
            <KpiTegel label="Geannuleerd" waarde={`${percGeannuleerd}%`} icon={XCircle} hint={`${status.geannuleerd} van ${totaal}`} />
            <KpiTegel label="Doorlooptijd" waarde={doorlooptijd != null ? `${doorlooptijd} u` : '—'} icon={Clock} hint="reserveren → ophalen" />
            <KpiTegel label="Lopend nu" waarde={lopendNu} icon={Activity} hint="actief + opgehaald" />
        </>
    )

    const grafieken = [
        {
            titel: `Reserveringen per ${eenheid}`,
            element: <RapportGrafiek type="line" data={trend} xKey="label" naamLabel="Reserveringen" />,
        },
        {
            titel: 'Statusverdeling',
            element: <RapportGrafiek type="pie" data={statusData} xKey="label" />,
        },
        {
            titel: 'Per medewerker',
            element: <RapportGrafiek type="bar" horizontaal data={perMedewerker.map(m => ({ label: m.naam, aantal: m.aantal }))} naamLabel="Reserveringen" kleur="#7C3AED" />,
        },
    ]

    return (
        <RapportageWeergave
            titel="Reserveringen"
            preset={periode.preset}
            onPeriodeChange={setPeriode}
            loading={loading}
            kpis={kpis}
            grafieken={grafieken}
            tabel={<RapportTabel titel="Reserveringen" kolommen={kolommen} rijen={tabelRijen} bestandsnaam="reserveringen" />}
        />
    )
}
