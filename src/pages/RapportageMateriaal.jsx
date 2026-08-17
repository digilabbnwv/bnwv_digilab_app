import React, { useEffect, useMemo, useState } from 'react'
import { Package, Boxes, MoonStar, Tag } from 'lucide-react'
import { getAllMateriaal } from '../lib/materiaal'
import {
    getTransactiesInPeriode, getLaatsteGebruikPerItem,
    telGebruikPerItem, telGebruikPerCategorie, telGebruikPerLocatie, bepaalOngebruikt,
    categorieLabel,
} from '../lib/rapportage'
import { periodeVoorPreset } from '../components/rapportage/PeriodeFilter'
import RapportageWeergave from '../components/rapportage/RapportageWeergave'
import RapportGrafiek from '../components/rapportage/RapportGrafiek'
import RapportTabel from '../components/rapportage/RapportTabel'
import KpiTegel from '../components/rapportage/KpiTegel'

function datumKort(iso) {
    if (!iso) return 'Nooit'
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RapportageMateriaal() {
    const [periode, setPeriode] = useState(() => ({ ...periodeVoorPreset('maand'), preset: 'maand' }))
    const [loading, setLoading] = useState(true)
    const [transacties, setTransacties] = useState([])
    const [materiaal, setMateriaal] = useState([])
    const [laatsteGebruik, setLaatsteGebruik] = useState(new Map())

    useEffect(() => {
        let actief = true
        Promise.all([
            getTransactiesInPeriode(periode.van, periode.tot),
            getAllMateriaal(),
            getLaatsteGebruikPerItem(),
        ])
            .then(([tx, mat, laatst]) => {
                if (!actief) return
                setTransacties(tx)
                setMateriaal(mat)
                setLaatsteGebruik(laatst)
            })
            .catch(console.error)
            .finally(() => { if (actief) setLoading(false) })
        return () => { actief = false }
    }, [periode.van, periode.tot])

    const perItem = useMemo(() => telGebruikPerItem(transacties), [transacties])
    const perCategorie = useMemo(() => telGebruikPerCategorie(transacties), [transacties])
    const perLocatie = useMemo(() => telGebruikPerLocatie(transacties), [transacties])
    const ongebruikt = useMemo(() => bepaalOngebruikt(materiaal, laatsteGebruik), [materiaal, laatsteGebruik])

    const totaalUitgecheckt = perItem.reduce((s, i) => s + i.aantal, 0)

    // Tabelrijen: alle materiaal met check-outs in de periode, aflopend gesorteerd
    const aantalPerId = useMemo(() => new Map(perItem.map(i => [i.id, i.aantal])), [perItem])
    const tabelRijen = useMemo(() => (
        materiaal
            .map(m => ({
                naam: m.naam,
                aantal: aantalPerId.get(m.id) || 0,
                laatst: datumKort(laatsteGebruik.get(m.id)),
                categorie: categorieLabel(m.categorie_prefix),
                locatie: m.standaard_locatie || '—',
            }))
            .sort((a, b) => b.aantal - a.aantal || a.naam.localeCompare(b.naam))
    ), [materiaal, aantalPerId, laatsteGebruik])

    const kolommen = [
        { key: 'naam', label: 'Materiaal' },
        { key: 'aantal', label: 'Check-outs', align: 'right' },
        { key: 'laatst', label: 'Laatst gebruikt' },
        { key: 'categorie', label: 'Categorie' },
        { key: 'locatie', label: 'Locatie' },
    ]

    const kpis = (
        <>
            <KpiTegel label="Check-outs" waarde={totaalUitgecheckt} icon={Package} hint="in periode" />
            <KpiTegel label="Unieke items" waarde={perItem.length} icon={Boxes} hint="minstens 1x gebruikt" />
            <KpiTegel label="Ongebruikt" waarde={ongebruikt.length} icon={MoonStar} hint=">90 dagen" />
            <KpiTegel label="Topcategorie" waarde={perCategorie[0]?.label || '—'} icon={Tag} hint={perCategorie[0] ? `${perCategorie[0].aantal} check-outs` : ''} />
        </>
    )

    const grafieken = [
        {
            titel: 'Meest gebruikt materiaal',
            element: <RapportGrafiek type="bar" horizontaal data={perItem.slice(0, 8).map(i => ({ label: i.naam, aantal: i.aantal }))} naamLabel="Check-outs" hoogte={280} />,
        },
        {
            titel: 'Check-outs per categorie',
            element: <RapportGrafiek type="bar" data={perCategorie} xKey="label" naamLabel="Check-outs" kleur="#7C3AED" />,
        },
        {
            titel: 'Check-outs per locatie',
            element: <RapportGrafiek type="pie" data={perLocatie} xKey="locatie" />,
        },
    ]

    return (
        <RapportageWeergave
            titel="Materiaalgebruik"
            preset={periode.preset}
            onPeriodeChange={setPeriode}
            loading={loading}
            kpis={kpis}
            grafieken={grafieken}
            tabel={<RapportTabel titel="Per materiaal" kolommen={kolommen} rijen={tabelRijen} bestandsnaam="materiaalgebruik" />}
        />
    )
}
