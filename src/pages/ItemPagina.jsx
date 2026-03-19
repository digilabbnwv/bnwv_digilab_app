import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMateriaalaItem } from '../lib/materiaal'
import { uitchecken, inchecken, overrule } from '../lib/materiaal'
import { verifyPin } from '../lib/auth'
import { getReserveringenVoorItem, getEersteActieveReservering, computeReserveringsContext } from '../lib/reserveringen'
import { StatusBadge, LaadIndicator, DatumTijd } from '../components/UI'
import Modal from '../components/Modal'
import PincodeInvoer from '../components/PincodeInvoer'
import { ArrowLeft, MapPin, User, Clock, AlertTriangle, ArrowDownCircle, ArrowUpCircle, QrCode, Wrench, CalendarDays, CalendarCheck, PackagePlus, Pencil } from 'lucide-react'

const LOCATIES = ['Ermelo', 'Nunspeet']

export default function ItemPagina() {
    const { qrCode } = useParams()
    const { medewerker, isBeheerder } = useAuth()
    const navigate = useNavigate()

    const [item, setItem] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fout, setFout] = useState('')
    const [actie, setActie] = useState(null)
    const [stap, setStap] = useState(1)
    const [gekozenLocatie, setGekozenLocatie] = useState('')
    const [pinFout, setPinFout] = useState('')
    const [pinLoading, setPinLoading] = useState(false)
    const [succes, setSucces] = useState('')
    const [reserveringen, setReserveringen] = useState([])
    const [gekoppeldeReservering, setGekoppeldeReservering] = useState(null)

    // Scan modus: als qrCode === 'scan', open camera
    const isScanModus = qrCode === 'scan'

    const laadItem = useCallback(async (code) => {
        setLoading(true)
        setFout('')
        try {
            const data = await getMateriaalaItem(code)
            setItem(data)
            // Laad ook reserveringen voor dit item
            const res = await getReserveringenVoorItem(data.id)
            setReserveringen(res)
        } catch {
            setFout('Item niet gevonden voor deze QR-code.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!isScanModus && qrCode) {
            laadItem(qrCode)
        } else {
            setLoading(false)
        }
    }, [qrCode, isScanModus, laadItem])

    const formatDatum = (d) => {
        if (!d) return ''
        const [, m, dag] = d.split('-')
        return `${dag}-${m}`
    }

    const openActie = (type) => {
        setActie(type)
        setStap(1)
        setPinFout('')
        setGekozenLocatie('')
        setGekoppeldeReservering(null)
    }

    const sluitActie = () => {
        setActie(null)
        setStap(1)
        setPinFout('')
    }

    const openMeldingen = item?.onderhoudsmeldingen?.filter(m => m.status === 'open') || []
    const heeftOpenMeldingen = openMeldingen.length > 0
    const isUitgechecktDoorMij = item?.huidige_medewerker_id === medewerker?.id
    const isUitgechecktDoorCollega = item?.status === 'in_gebruik' && !isUitgechecktDoorMij

    const handlePinMeenemen = async (pin) => {
        setPinLoading(true)
        setPinFout('')
        try {
            await verifyPin(medewerker.id, pin)
        } catch (err) {
            setPinFout(err.message || 'Onjuiste pincode')
            setPinLoading(false)
            return
        }

        // Pincode correct — nu uitchecken
        try {
            if (isUitgechecktDoorCollega) {
                setStap(4) // overrule bevestiging
            } else {
                await uitchecken(item.id, medewerker.id, medewerker.naam, gekoppeldeReservering?.id || null)
                setSucces('Item succesvol meegenomen!')
                sluitActie()
                laadItem(qrCode)
            }
        } catch (err) {
            sluitActie()
            setFout(`Fout bij meenemen: ${err.message || err.details || JSON.stringify(err)}`)
        } finally {
            setPinLoading(false)
        }
    }

    const handlePinTerugbrengen = async (pin) => {
        setPinLoading(true)
        setPinFout('')
        try {
            await verifyPin(medewerker.id, pin)
            if (isUitgechecktDoorCollega) {
                setStap(3) // overrule bevestiging
            } else {
                setStap(2) // locatie kiezen
            }
        } catch (err) {
            setPinFout(err.message || 'Onjuiste pincode')
        } finally {
            setPinLoading(false)
        }
    }

    const handleLocatieBevestigen = async () => {
        if (!gekozenLocatie) return
        setPinLoading(true)
        try {
            await inchecken(item.id, medewerker.id, gekozenLocatie, item.huidige_locatie)
            setSucces(`Item terug op ${gekozenLocatie}!`)
            sluitActie()
            laadItem(qrCode)
        } catch (err) {
            sluitActie()
            setFout(`Fout bij terugbrengen: ${err.message || err.details || JSON.stringify(err)}`)
        } finally {
            setPinLoading(false)
        }
    }

    const handleOverrule = async () => {
        setPinLoading(true)
        try {
            if (actie === 'meenemen') {
                await uitchecken(item.id, medewerker.id, medewerker.naam, gekoppeldeReservering?.id || null)
                setSucces('Item overgenomen!')
                sluitActie()
                laadItem(qrCode)
            } else {
                setStap(2)
                setPinLoading(false)
            }
        } catch (err) {
            sluitActie()
            setFout(`Fout bij overnemen: ${err.message || err.details || JSON.stringify(err)}`)
            setPinLoading(false)
        }
    }

    const handleOverruleTerugbrengen = async () => {
        if (!gekozenLocatie) return
        setPinLoading(true)
        try {
            await overrule(item.id, medewerker.id, medewerker.naam, item.huidige_medewerker_id, gekozenLocatie)
            setSucces(`Item teruggebracht op ${gekozenLocatie}!`)
            sluitActie()
            laadItem(qrCode)
        } catch (err) {
            setPinFout(err.message)
        } finally {
            setPinLoading(false)
        }
    }

    if (isScanModus) {
        return (
            <div className="app-container pt-8 pb-4">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary">
                    <ArrowLeft size={18} /> Terug
                </button>
                <div className="card p-8 text-center space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-end flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
                        <QrCode size={36} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-text-primary">QR-code scannen</h1>
                    <p className="text-text-secondary text-sm">
                        Gebruik de camera van je telefoon om een QR-code te scannen.<br />
                        De camera-app opent automatisch de juiste pagina.
                    </p>
                    <div className="bg-bg-app rounded-xl p-4 text-left space-y-2">
                        <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">URL-formaat</p>
                        <code className="text-accent text-xs break-all">/item/[qr-code]</code>
                    </div>
                    <p className="text-text-muted text-xs">
                        Tip: open de camera-app, richt op de QR-code en tik op de melding om de link te openen.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors">
                    <ArrowLeft size={18} /> Terug
                </button>
                {isBeheerder && item && (
                    <Link
                        to={`/materiaal/${item.id}/bewerken`}
                        className="btn-accent py-1.5 px-3 text-sm flex items-center gap-1.5"
                    >
                        <Pencil size={14} /> Bewerken
                    </Link>
                )}
            </div>

            {loading && <LaadIndicator />}

            {fout && !loading && (
                <div className="card p-8 text-center space-y-3">
                    <div className="text-4xl">❓</div>
                    <p className="text-text-primary font-semibold">Item niet gevonden</p>
                    <p className="text-text-muted text-sm">{fout}</p>
                </div>
            )}

            {succes && (
                <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-success text-sm mb-4 flex items-center gap-2">
                    <span>✓</span> {succes}
                </div>
            )}

            {item && !loading && (
                <>
                    {/* Itemkaart */}
                    <div className="card p-5 space-y-4 mb-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold text-text-primary leading-tight mb-0.5">{item.naam}</h1>
                                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                    <p className="text-text-muted text-sm">{item.type}</p>
                                    {item.merk && (
                                        <span className="text-xs bg-overlay/5 border border-overlay/10 text-text-muted px-2 py-0.5 rounded-full">{item.merk}</span>
                                    )}
                                    {item.aantal != null && (
                                        <span className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                                            {item.aantal}x
                                        </span>
                                    )}
                                </div>
                                {item.qr_code && (
                                    <code className="text-xs font-mono text-accent mt-1 block tracking-wider">{item.qr_code}</code>
                                )}
                            </div>
                            <StatusBadge status={item.status} />
                        </div>

                        {heeftOpenMeldingen && (
                            <div className="bg-error/10 border border-error/30 rounded-xl p-3 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-error flex-shrink-0" />
                                <p className="text-error text-sm font-medium">
                                    {openMeldingen.length} openstaande onderhoudsmelding{openMeldingen.length > 1 ? 'en' : ''}
                                </p>
                            </div>
                        )}

                        {/* Details */}
                        <div className="space-y-2.5 pt-2 border-t border-overlay/10">
                            {item.status === 'in_gebruik' && item.huidige_medewerker && (
                                <div className="flex items-center gap-3">
                                    <User size={15} className="text-text-muted flex-shrink-0" />
                                    <span className="text-text-secondary text-sm">Bij: <span className="text-text-primary font-medium">{item.huidige_medewerker.naam}</span></span>
                                </div>
                            )}
                            {item.status === 'beschikbaar' && item.huidige_locatie && (
                                <div className="flex items-center gap-3">
                                    <MapPin size={15} className="text-text-muted flex-shrink-0" />
                                    <span className="text-text-secondary text-sm">Locatie: <span className="text-text-primary font-medium">{item.huidige_locatie}</span></span>
                                </div>
                            )}
                            {item.laatste_medewerker_naam && item.status === 'beschikbaar' && (
                                <div className="flex items-center gap-3">
                                    <Clock size={15} className="text-text-muted flex-shrink-0" />
                                    <span className="text-text-secondary text-sm">Laatst bij: <span className="text-text-primary">{item.laatste_medewerker_naam}</span></span>
                                </div>
                            )}
                        </div>

                        {/* Omschrijving */}
                        {item.omschrijving && (
                            <div className="pt-3 border-t border-overlay/10">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Omschrijving</p>
                                <p className="text-text-secondary text-sm leading-relaxed">{item.omschrijving}</p>
                            </div>
                        )}

                        {/* Inhoud */}
                        {item.inhoud && (
                            <div className="pt-3 border-t border-overlay/10">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Inhoud / onderdelen</p>
                                <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{item.inhoud}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Reserveringsbanner ────────────────────── */}
                    {(() => {
                        const eersteRes = getEersteActieveReservering(reserveringen)
                        if (!eersteRes) return null
                        const isMijn = eersteRes.medewerker?.id === medewerker.id
                        const formatD = (d) => {
                            const [jaar, m, dag] = d.split('-')
                            return `${dag}-${m}-${jaar}`
                        }
                        return (
                            <div className={`rounded-xl p-4 mb-4 border flex items-start gap-3 ${isMijn
                                ? 'bg-success/10 border-success/30'
                                : 'bg-amber-500/10 border-amber-500/40'
                                }`}>
                                <CalendarDays size={18} className={`flex-shrink-0 mt-0.5 ${isMijn ? 'text-success' : 'text-amber-400'}`} />
                                <div className="flex-1 min-w-0">
                                    {isMijn ? (
                                        <>
                                            <p className="text-success text-sm font-semibold">Dit item staat voor jou gereserveerd</p>
                                            <p className="text-success/80 text-xs mt-0.5">
                                                {formatD(eersteRes.van_datum)} → {formatD(eersteRes.tot_datum)}
                                                {eersteRes.toelichting && ` — ${eersteRes.toelichting}`}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-amber-400 text-sm font-semibold">
                                                ⚠️ Let op: {eersteRes.medewerker?.naam} heeft dit item gereserveerd
                                            </p>
                                            <p className="text-amber-400/80 text-xs mt-0.5">
                                                Van {formatD(eersteRes.van_datum)} tot {formatD(eersteRes.tot_datum)}
                                                {eersteRes.toelichting && ` — "${eersteRes.toelichting}"`}
                                            </p>
                                            <p className="text-amber-300 text-xs mt-1 font-medium">
                                                Je kunt het item nog steeds meenemen, maar stem dit af met jouw collega.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })()}

                    {/* Acties */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            id="btn-meenemen"
                            onClick={() => openActie('meenemen')}
                            className={`${isUitgechecktDoorMij ? 'btn-ghost' : 'btn-primary'} flex items-center justify-center gap-2 py-4`}
                        >
                            <ArrowUpCircle size={20} /> Meenemen
                        </button>
                        <button
                            id="btn-terugbrengen"
                            onClick={() => openActie('terugbrengen')}
                            className={`${isUitgechecktDoorMij ? 'btn-primary' : 'btn-ghost'} flex items-center justify-center gap-2 py-4`}
                        >
                            <ArrowDownCircle size={20} /> Terugbrengen
                        </button>
                    </div>

                    {/* Melding maken */}
                    <Link
                        to={`/melding/nieuw/${item.id}`}
                        className="card p-4 flex items-center gap-3 hover:bg-bg-hover transition-colors w-full"
                    >
                        <Wrench size={18} className="text-accent" />
                        <span className="text-text-secondary text-sm">Onderhoudsmelding maken</span>
                    </Link>
                </>
            )}

            {/* Modal: Meenemen — Stap 1: Reserveringscontext */}
            {actie === 'meenemen' && stap === 1 && (
                <Modal title="Meenemen" onClose={sluitActie}>
                    {heeftOpenMeldingen && (
                        <div className="bg-error/10 border border-error/30 rounded-xl p-3 mb-4 text-error text-sm">
                            Dit item heeft een openstaande onderhoudsmelding. Weet je zeker dat je het wilt meenemen?
                        </div>
                    )}
                    {isUitgechecktDoorCollega && (
                        <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mb-4 text-accent text-sm">
                            Dit item is uitgecheckt door <strong>{item.huidige_medewerker?.naam}</strong>. Je pincode wordt gevraagd ter bevestiging.
                        </div>
                    )}

                    {(() => {
                        const ctx = computeReserveringsContext(reserveringen, medewerker.id)

                        if (ctx.scenario === 'eigen_reservering') return (
                            <div className="rounded-xl p-4 border border-success/30 bg-success/10 space-y-2">
                                <div className="flex items-center gap-2">
                                    <CalendarCheck size={18} className="text-success" />
                                    <p className="text-success text-sm font-semibold">Dit item staat voor jou gereserveerd</p>
                                </div>
                                <p className="text-success/80 text-xs">
                                    {formatDatum(ctx.eigenReservering.van_datum)} t/m {formatDatum(ctx.eigenReservering.tot_datum)}
                                    {ctx.eigenReservering.toelichting && ` — ${ctx.eigenReservering.toelichting}`}
                                </p>
                                <button
                                    onClick={() => { setGekoppeldeReservering(ctx.eigenReservering); setStap(2) }}
                                    className="btn-primary w-full py-2.5 mt-2"
                                >
                                    Ophalen voor reservering
                                </button>
                                <button
                                    onClick={() => { setGekoppeldeReservering(null); setStap(2) }}
                                    className="text-text-muted text-xs underline w-full text-center mt-1"
                                >
                                    Liever ad-hoc meenemen
                                </button>
                            </div>
                        )

                        if (ctx.scenario === 'ad_hoc_conflict') return (
                            <div className="rounded-xl p-4 border border-amber-500/40 bg-amber-500/10 space-y-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-amber-400" />
                                    <p className="text-amber-400 text-sm font-semibold">
                                        {ctx.eerstvolgendeAnders?.medewerker?.naam || 'Een collega'} heeft dit item gereserveerd
                                    </p>
                                </div>
                                <p className="text-amber-400/80 text-xs">
                                    Reservering begint op {formatDatum(ctx.eerstvolgendeAnders?.van_datum)}
                                </p>
                                <div className="bg-amber-500/10 rounded-lg p-3 flex items-center gap-2">
                                    <Clock size={16} className="text-amber-300 flex-shrink-0" />
                                    <p className="text-amber-300 text-sm font-semibold">
                                        Breng terug voor: {formatDatum(ctx.terugbrengDeadline)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setGekoppeldeReservering(null); setStap(2) }}
                                    className="btn-primary w-full py-2.5 bg-amber-600 hover:bg-amber-700"
                                >
                                    Ik begrijp het, meenemen
                                </button>
                            </div>
                        )

                        // Scenario: ad_hoc_vrij
                        return (
                            <div className="rounded-xl p-4 border border-overlay/10 bg-bg-hover space-y-2">
                                <div className="flex items-center gap-2">
                                    <PackagePlus size={18} className="text-text-secondary" />
                                    <p className="text-text-primary text-sm font-semibold">Geen reserveringen — vrij beschikbaar</p>
                                </div>
                                <button
                                    onClick={() => { setGekoppeldeReservering(null); setStap(2) }}
                                    className="btn-primary w-full py-2.5 mt-2"
                                >
                                    Meenemen
                                </button>
                            </div>
                        )
                    })()}
                </Modal>
            )}

            {/* Modal: Meenemen — Stap 2: Pincode */}
            {actie === 'meenemen' && stap === 2 && (
                <Modal title="Bevestig met pincode" onClose={sluitActie}>
                    <PincodeInvoer
                        onBevestig={handlePinMeenemen}
                        loading={pinLoading}
                        error={pinFout}
                        label="Bevestig met jouw pincode"
                    />
                </Modal>
            )}

            {/* Modal: Overrule bevestiging (meenemen) */}
            {actie === 'meenemen' && stap === 4 && (
                <Modal title="Overnemen van collega" onClose={sluitActie}>
                    <p className="text-text-secondary text-sm mb-4">
                        Dit item is uitgecheckt door <strong className="text-text-primary">{item.huidige_medewerker?.naam}</strong>.<br />
                        Weet je zeker dat jij het meeneemt?
                    </p>
                    <div className="flex gap-3">
                        <button onClick={sluitActie} className="btn-ghost flex-1">Annuleren</button>
                        <button onClick={handleOverrule} className="btn-primary flex-1" disabled={pinLoading}>
                            {pinLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Ja, meenemen'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Modal: Terugbrengen — pincode */}
            {actie === 'terugbrengen' && stap === 1 && (
                <Modal title="Terugbrengen" onClose={sluitActie}>
                    {isUitgechecktDoorCollega && (
                        <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mb-4 text-accent text-sm">
                            ⚠️ Dit item is uitgecheckt door <strong>{item.huidige_medewerker?.naam}</strong>.
                        </div>
                    )}
                    <PincodeInvoer
                        onBevestig={handlePinTerugbrengen}
                        loading={pinLoading}
                        error={pinFout}
                        label="Bevestig met jouw pincode"
                    />
                </Modal>
            )}

            {/* Modal: Locatie kiezen */}
            {actie === 'terugbrengen' && stap === 2 && (
                <Modal title="Kies locatie" onClose={sluitActie}>
                    <p className="text-text-secondary text-sm mb-4">Waar breng je het item terug?</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {LOCATIES.map(loc => (
                            <button
                                key={loc}
                                onClick={() => setGekozenLocatie(loc)}
                                className={`card p-4 text-center font-semibold transition-all ${gekozenLocatie === loc
                                    ? 'border-primary text-primary bg-primary/10'
                                    : 'text-text-secondary hover:bg-bg-hover'
                                    }`}
                            >
                                <MapPin size={20} className="mx-auto mb-1" />
                                {loc}
                            </button>
                        ))}
                    </div>
                    {isUitgechecktDoorCollega ? (
                        <button
                            onClick={handleOverruleTerugbrengen}
                            className="btn-primary w-full"
                            disabled={!gekozenLocatie || pinLoading}
                        >
                            {pinLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Bevestigen (overrule)'}
                        </button>
                    ) : (
                        <button
                            onClick={handleLocatieBevestigen}
                            className="btn-primary w-full"
                            disabled={!gekozenLocatie || pinLoading}
                        >
                            {pinLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Bevestigen'}
                        </button>
                    )}
                </Modal>
            )}
        </div>
    )
}
