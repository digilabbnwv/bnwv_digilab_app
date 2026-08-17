import React, { useEffect, useMemo, useState } from 'react'
import { Users, UserCheck, LogIn, Package } from 'lucide-react'
import { getMedewerkers, getLoginsInPeriode, getReserveringenInPeriode, getTransactiesInPeriode, activiteitPerMedewerker } from '../lib/rapportage'
import { periodeVoorPreset } from '../components/rapportage/PeriodeFilter'
import RapportageWeergave from '../components/rapportage/RapportageWeergave'
import RapportGrafiek from '../components/rapportage/RapportGrafiek'
import RapportTabel from '../components/rapportage/RapportTabel'
import KpiTegel from '../components/rapportage/KpiTegel'

function datumKort(iso) {
    if (!iso) return 'Nooit'
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default function RapportageGebruikers() {
    const [periode, setPeriode] = useState(() => ({ ...periodeVoorPreset('maand'), preset: 'maand' }))
    const [loading, setLoading] = useState(true)
    const [medewerkers, setMedewerkers] = useState([])
    const [logins, setLogins] = useState([])
    const [reserveringen, setReserveringen] = useState([])
    const [transacties, setTransacties] = useState([])

    useEffect(() => {
        let actief = true
        Promise.all([
            getMedewerkers(),
            getLoginsInPeriode(periode.van, periode.tot),
            getReserveringenInPeriode(periode.van, periode.tot),
            getTransactiesInPeriode(periode.van, periode.tot),
        ])
            .then(([m, l, r, t]) => {
                if (!actief) return
                setMedewerkers(m); setLogins(l); setReserveringen(r); setTransacties(t)
            })
            .catch(console.error)
            .finally(() => { if (actief) setLoading(false) })
        return () => { actief = false }
    }, [periode.van, periode.tot])

    const activiteit = useMemo(
        () => activiteitPerMedewerker(medewerkers, { logins, reserveringen, transacties }),
        [medewerkers, logins, reserveringen, transacties],
    )

    const totaalCheckouts = transacties.filter(t => t.type === 'uitchecken').length
    const actiefAantal = activiteit.filter(a => a.logins > 0).length

    const tabelRijen = useMemo(() => activiteit.map(a => ({
        naam: a.naam,
        logins: a.logins,
        reserveringen: a.reserveringen,
        checkouts: a.checkouts,
        laatsteLogin: datumKort(a.laatsteLogin),
    })), [activiteit])

    const kolommen = [
        { key: 'naam', label: 'Medewerker' },
        { key: 'logins', label: 'Logins', align: 'right' },
        { key: 'reserveringen', label: 'Reserveringen', align: 'right' },
        { key: 'checkouts', label: 'Check-outs', align: 'right' },
        { key: 'laatsteLogin', label: 'Laatste login' },
    ]

    const kpis = (
        <>
            <KpiTegel label="Medewerkers" waarde={medewerkers.length} icon={Users} />
            <KpiTegel label="Actief" waarde={actiefAantal} icon={UserCheck} hint="min. 1 login" />
            <KpiTegel label="Logins" waarde={logins.length} icon={LogIn} hint="in periode" />
            <KpiTegel label="Check-outs" waarde={totaalCheckouts} icon={Package} hint="in periode" />
        </>
    )

    const grafieken = [
        {
            titel: 'Logins per medewerker',
            element: <RapportGrafiek type="bar" horizontaal data={activiteit.map(a => ({ label: a.naam, aantal: a.logins }))} naamLabel="Logins" />,
        },
        {
            titel: 'Reserveringen per medewerker',
            element: <RapportGrafiek type="bar" horizontaal data={activiteit.map(a => ({ label: a.naam, aantal: a.reserveringen }))} naamLabel="Reserveringen" kleur="#7C3AED" />,
        },
        {
            titel: 'Check-outs per medewerker',
            element: <RapportGrafiek type="bar" horizontaal data={activiteit.map(a => ({ label: a.naam, aantal: a.checkouts }))} naamLabel="Check-outs" kleur="#10B981" />,
        },
    ]

    return (
        <RapportageWeergave
            titel="Gebruikersactiviteit"
            preset={periode.preset}
            onPeriodeChange={setPeriode}
            loading={loading}
            kpis={kpis}
            grafieken={grafieken}
            tabel={<RapportTabel titel="Per medewerker" kolommen={kolommen} rijen={tabelRijen} bestandsnaam="gebruikersactiviteit" />}
        />
    )
}
