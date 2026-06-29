import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMateriaalaItem } from '../lib/materiaal'
import { uitchecken, inchecken, overrule } from '../lib/materiaal'
import { verifyPin } from '../lib/auth'
import { getReserveringenVoorItem, getEersteActieveReservering, computeReserveringsContext } from '../lib/reserveringen'
import { getGeplandeWorkshopsVoorMateriaal } from '../lib/geplandeWorkshops'
import { StatusBadge, LaadIndicator, DatumTijd } from '../components/UI'
import Modal from '../components/Modal'
import PincodeInvoer from '../components/PincodeInvoer'
import BeschikbaarheidIndicator from '../components/BeschikbaarheidIndicator'
import MeenemenContextKaart from '../components/MeenemenContextKaart'
import QrScanner from '../components/QrScanner'
import { useToast } from '../context/ToastContext'
import { foutTekst } from '../lib/foutmelding'
import { ArrowLeft, MapPin, User, Clock, AlertTriangle, ArrowDownCircle, ArrowUpCircle, QrCode, Wrench, CalendarDays, CalendarCheck, PackagePlus, Pencil, Truck } from 'lucide-react'

const LOCATIES = ['Ermelo', 'Nunspeet', 'Harderwijk', 'Putten', 'Elspeet', 'Anders']

export default function ItemPagina() {
    const { qrCode } = useParams()
    const { medewerker, isBeheerder } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    const [item, setItem] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fout, setFout] = useState('')
    const [actie, setActie] = useState(null)
    const [stap, setStap] = useState(1)
    const [gekozenLocatie, setGekozenLocatie] = useState('')
    const [pinFout, setPinFout] = useState('')
    const [pinLoading, setPinLoading] = useState(false)
    const [reserveringen, setReserveringen] = useState([])
    const [gekoppeldeReservering, setGekoppeldeReservering] = useState(null)
    const [workshopConflicten, setWorkshopConflicten] = useState([])
    const [verzendRetour, setVerzendRetour] = useState(false)
    const [verzendVertraging, setVerzendVertraging] = useState(1)

    // Scan modus: als qrCode === 'scan', open camera
    const isScanModus = qrCode === 'scan'

    const laadItem = useCallback(async (code) => {
        setLoading(true)
        setFout('')
        try {
            const data = await getMateriaalaItem(code)
            setItem(data)
            // Laad reserveringen én geplande workshops voor dit item parallel
            const [res, workshops] = await Promise.all([
                getReserveringenVoorItem(data.id),
                getGeplandeWorkshopsVoorMateriaal(data.id),
            ])
            setReserveringen(res)
            setWorkshopConflicten(workshops)
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

    const openMeldingen = item?.onderhoudsmeldingen?.filter(m => m.status === 'open') || []
    const heeftOpenMeldingen = openMeldingen.length > 0
    const isUitgechecktDoorMij = item?.huidige_medewerker_id === medewerker?.id
    const isUitgechecktDoorCollega = item?.status === 'in_gebruik' && !isUitgechecktDoorMij

    const openActie = (type) => {
        setActie(type)
        setPinFout('')
        setGekozenLocatie('')
        setGekoppeldeReservering(null)
        // Eigen materiaal terugbrengen vraagt geen pincode → direct naar locatiekeuze.
        if (type === 'terugbrengen' && !isUitgechecktDoorCollega) {
            setStap(2)
        } else {
            setStap(1)
        }
    }

    const sluitActie = () => {
        setActie(null)
        setStap(1)
        setPinFout('')
        setVerzendRetour(false)
        setVerzendVertraging(1)
    }

    // Eigen/vrij meenemen → direct uitchecken (geen pincode).
    // Overnemen van een collega is gevoelig → pincode + extra bevestiging.
    const bevestigMeenemen = async (reservering) => {
        setGekoppeldeReservering(reservering)
        if (isUitgechecktDoorCollega) {
            setStap(2) // pincode → overrule
        } else {
            await doeUitchecken(reservering)
        }
    }

    const doeUitchecken = async (reservering) => {
        setPinLoading(true)
        try {
            await uitchecken(item.id, medewerker.id, medewerker.naam, reservering?.id || null)
            toast.succes('Materiaal meegenomen!')
            sluitActie()
            laadItem(qrCode)
        } catch (err) {
            sluitActie()
            toast.fout(foutTekst(err, 'Meenemen lukte niet — probeer het opnieuw of meld het bij de beheerder.'))
        } finally {
            setPinLoading(false)
        }
    }

    // Pincode-stap wordt alleen bereikt bij overnemen van een collega (gevoelig).
    const handlePinMeenemen = async (pin) => {
        setPinLoading(true)
        setPinFout('')
        try {
            await verifyPin(medewerker.id, pin)
            setStap(4) // overrule-bevestiging
        } catch {
            setPinFout('Onjuiste pincode')
        } finally {
            setPinLoading(false)
        }
    }

    const handlePinTerugbrengen = async (pin) => {
        setPinLoading(true)
        setPinFout('')
        try {
            await verifyPin(medewerker.id, pin)
            setStap(2) // locatie kiezen
        } catch {
            setPinFout('Onjuiste pincode')
        } finally {
            setPinLoading(false)
        }
    }

    const handleLocatieBevestigen = async () => {
        if (!gekozenLocatie) return
        setPinLoading(true)
        try {
            await inchecken(item.id, medewerker.id, gekozenLocatie, item.huidige_locatie)
            if (verzendRetour) {
                const aankomst = new Date()
                aankomst.setDate(aankomst.getDate() + verzendVertraging)
                const aankomstStr = aankomst.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
                toast.succes(`Retour geregistreerd via vervoersdienst. Verwachte aankomst: ${aankomstStr}.`)
            } else {
                toast.succes(`Materiaal terug op ${gekozenLocatie}!`)
            }
            sluitActie()
            laadItem(qrCode)
        } catch (err) {
            sluitActie()
            toast.fout(foutTekst(err, 'Terugbrengen lukte niet — probeer het opnieuw.'))
        } finally {
            setPinLoading(false)
        }
    }

    const handleOverrule = async () => {
        setPinLoading(true)
        try {
            await uitchecken(item.id, medewerker.id, medewerker.naam, gekoppeldeReservering?.id || null)
            toast.succes('Materiaal overgenomen!')
            sluitActie()
            laadItem(qrCode)
        } catch (err) {
            sluitActie()
            toast.fout(foutTekst(err, 'Overnemen lukte niet — probeer het opnieuw.'))
        } finally {
            setPinLoading(false)
        }
    }

    const handleOverruleTerugbrengen = async () => {
        if (!gekozenLocatie) return
        setPinLoading(true)
        try {
            await overrule(item.id, medewerker.id, medewerker.naam, item.huidige_medewerker_id, gekozenLocatie)
            toast.succes(`Materiaal teruggebracht op ${gekozenLocatie}!`)
            sluitActie()
            laadItem(qrCode)
        } catch (err) {
            toast.fout(foutTekst(err, 'Terugbrengen lukte niet — probeer het opnieuw.'))
        } finally {
            setPinLoading(false)
        }
    }

    // Gescande waarde kan een volledige URL zijn (.../item/CODE) of de kale QR-code.
    const handleScanDetect = useCallback((waarde) => {
        if (!waarde) return
        const m = String(waarde).match(/\/item\/([^/?#]+)/)
        const code = m ? decodeURIComponent(m[1]) : String(waarde).trim()
        navigate(`/item/${code}`, { replace: true })
    }, [navigate])

    if (isScanModus) {
        return (
            <div className="app-container pt-8 pb-4 animate-fadeIn">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary">
                    <ArrowLeft size={18} /> Terug
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-end flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                        <QrCode size={22} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary">QR-code scannen</h1>
                </div>
                <QrScanner onDetect={handleScanDetect} />
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

                    {/* ── Beschikbaarheid tijdlijn ──────────────── */}
                    {item && (
                        <div className="card p-4 mb-4">
                            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Beschikbaarheid komende 14 dagen</p>
                            <BeschikbaarheidIndicator materiaalId={item.id} aantalDagen={14} />
                        </div>
                    )}

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

                    {/* ── Workshop-conflictbanner ────────────────── */}
                    {workshopConflicten.length > 0 && (() => {
                        const eerst = workshopConflicten[0]
                        const dagVerschil = Math.ceil((new Date(eerst.datum + 'T00:00:00') - new Date()) / 86400000)
                        const isUrgent = dagVerschil <= 7
                        const formatD = (d) => { const [j, m, dag] = d.split('-'); return `${dag}-${m}-${j}` }
                        return (
                            <div className={`rounded-xl p-4 mb-4 border flex items-start gap-3 ${isUrgent ? 'bg-error/10 border-error/30' : 'bg-amber-500/10 border-amber-500/40'}`}>
                                <CalendarDays size={18} className={`flex-shrink-0 mt-0.5 ${isUrgent ? 'text-error' : 'text-amber-400'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${isUrgent ? 'text-error' : 'text-amber-400'}`}>
                                        {isUrgent ? '⚠️ Binnenkort nodig voor workshop' : 'Gepland voor workshop'}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${isUrgent ? 'text-error/80' : 'text-amber-400/80'}`}>
                                        {eerst.titel} — {formatD(eerst.datum)} {eerst.start_tijd?.slice(0, 5)} · {eerst.locatie}
                                        {eerst.uitvoerder?.naam && ` · ${eerst.uitvoerder.naam}`}
                                    </p>
                                    {workshopConflicten.length > 1 && (
                                        <p className={`text-xs mt-0.5 ${isUrgent ? 'text-error/60' : 'text-amber-400/60'}`}>
                                            + {workshopConflicten.length - 1} andere geplande workshop{workshopConflicten.length > 2 ? 's' : ''}
                                        </p>
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

                    <MeenemenContextKaart
                        context={computeReserveringsContext(reserveringen, medewerker.id, workshopConflicten)}
                        workshops={workshopConflicten}
                        bezig={pinLoading}
                        onKies={bevestigMeenemen}
                    />
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

                    {/* Retour via vervoersdienst */}
                    <button
                        onClick={() => setVerzendRetour(v => !v)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all mb-4 ${verzendRetour
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-overlay/20 text-text-muted hover:bg-bg-hover'
                            }`}
                    >
                        <Truck size={18} className="flex-shrink-0" />
                        <span className="text-sm font-medium">Retour via vervoersdienst</span>
                        <span className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${verzendRetour ? 'border-accent bg-accent' : 'border-overlay/40'}`}>
                            {verzendRetour && <span className="w-2 h-2 rounded-full bg-white block" />}
                        </span>
                    </button>

                    {verzendRetour && (
                        <div className="mb-4 p-3 bg-overlay/5 rounded-xl border border-overlay/10">
                            <p className="text-text-muted text-xs mb-2">Verwachte aankomst</p>
                            <div className="flex gap-2">
                                {[1, 2].map(dagen => {
                                    const d = new Date()
                                    d.setDate(d.getDate() + dagen)
                                    const label = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
                                    return (
                                        <button
                                            key={dagen}
                                            onClick={() => setVerzendVertraging(dagen)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${verzendVertraging === dagen
                                                ? 'border-accent bg-accent/10 text-accent'
                                                : 'border-overlay/20 text-text-secondary hover:bg-bg-hover'
                                                }`}
                                        >
                                            +{dagen} dag{dagen > 1 ? 'en' : ''}<br />
                                            <span className="text-xs font-normal opacity-75">{label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

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
