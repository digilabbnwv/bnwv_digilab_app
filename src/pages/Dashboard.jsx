import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUitgechecktMateriaal, getMijnMateriaal, getAllMateriaal, uitchecken } from '../lib/materiaal'
import { getOpenMeldingen } from '../lib/onderhoud'
import { checkReserveringsContext, computeReserveringsContext, getReserveringenVoorItem } from '../lib/reserveringen'
import { verifyPin } from '../lib/auth'
import { StatusBadge, LaadIndicator, DatumTijd } from '../components/UI'
import Modal from '../components/Modal'
import PincodeInvoer from '../components/PincodeInvoer'
import { CalendarDays, PackagePlus, Wrench, Package, AlertTriangle, ChevronRight, User, CalendarCheck, Clock } from 'lucide-react'

export default function Dashboard() {
    const { medewerker } = useAuth()
    const [uitgecheckt, setUitgecheckt] = useState([])
    const [mijnMateriaal, setMijnMateriaal] = useState([])
    const [meldingen, setMeldingen] = useState([])
    const [loading, setLoading] = useState(true)

    // "Nu meenemen" modal state
    const [toonMeenemen, setToonMeenemen] = useState(false)
    const [beschikbaar, setBeschikbaar] = useState([])
    const [gekozenId, setGekozenId] = useState('')
    const [meeneemStap, setMeeneemStap] = useState(1) // 1=kies, 2=context, 3=pin
    const [meeneemLoading, setMeeneemLoading] = useState(false)
    const [meeneemFout, setMeeneemFout] = useState('')
    const [resContext, setResContext] = useState(null)
    const [resContextLoading, setResContextLoading] = useState(false)
    const [gekoppeldeReservering, setGekoppeldeReservering] = useState(null)
    const [deadlines, setDeadlines] = useState({}) // { materiaalId: 'YYYY-MM-DD' }

    useEffect(() => {
        laden()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const laden = async () => {
        setLoading(true)
        try {
            const [u, m, mel] = await Promise.all([
                getUitgechecktMateriaal(),
                getMijnMateriaal(medewerker.id),
                getOpenMeldingen(),
            ])
            setUitgecheckt(u)
            setMijnMateriaal(m)
            setMeldingen(mel)

            // Bereken terugbrengdeadlines voor "Bij mij" items
            const deadlineMap = {}
            await Promise.all(m.map(async (item) => {
                try {
                    const res = await getReserveringenVoorItem(item.id)
                    const ctx = computeReserveringsContext(res, medewerker.id)
                    if (ctx.terugbrengDeadline) {
                        deadlineMap[item.id] = {
                            datum: ctx.terugbrengDeadline,
                            naam: ctx.eerstvolgendeAnders?.medewerker?.naam,
                        }
                    }
                } catch { /* negeer fouten bij deadline berekening */ }
            }))
            setDeadlines(deadlineMap)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const openMeenemen = async () => {
        setToonMeenemen(true)
        setGekozenId('')
        setMeeneemStap(1)
        setMeeneemFout('')
        setResContext(null)
        setGekoppeldeReservering(null)
        try {
            const alle = await getAllMateriaal()
            setBeschikbaar(alle.filter(i => i.status === 'beschikbaar'))
        } catch (err) {
            console.error(err)
        }
    }

    const handleNaarContext = async () => {
        if (!gekozenId) return
        setResContextLoading(true)
        try {
            const ctx = await checkReserveringsContext(gekozenId, medewerker.id)
            setResContext(ctx)
            setGekoppeldeReservering(null)
            setMeeneemStap(2)
        } catch (err) {
            console.error(err)
            // Bij fout direct door naar pin
            setResContext({ scenario: 'ad_hoc_vrij', eigenReservering: null, eerstvolgendeAnders: null, terugbrengDeadline: null })
            setMeeneemStap(2)
        } finally {
            setResContextLoading(false)
        }
    }

    const handleMeeneemPin = async (pin) => {
        setMeeneemLoading(true)
        setMeeneemFout('')
        try {
            await verifyPin(medewerker.id, pin)
            await uitchecken(gekozenId, medewerker.id, medewerker.naam, gekoppeldeReservering?.id || null)
            setToonMeenemen(false)
            await laden()
        } catch (err) {
            setMeeneemFout(err.message || 'Uitchecken mislukt')
        } finally {
            setMeeneemLoading(false)
        }
    }

    const formatDatum = (d) => {
        if (!d) return ''
        const [, m, dag] = d.split('-')
        return `${dag}-${m}`
    }

    const uur = new Date().getHours()
    const groet = uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond'

    return (
        <div className="app-container pt-8 pb-4 space-y-6 animate-fadeIn">
            {/* Groet + logo */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-text-muted text-sm">{groet},</p>
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">{medewerker.naam.split(' ')[0]} 👋</h1>
                </div>
                <img
                    src="/bnwv_digilab_app/logo-bnwv.png"
                    alt="Bibliotheek Noordwest Veluwe"
                    className="w-20 h-20 object-contain opacity-80"
                />
            </div>

            {/* Snelknoppen */}
            <div className="grid grid-cols-3 gap-3">
                <Link
                    to="/reserveren?nieuw=true"
                    className="card p-4 flex flex-col items-center gap-3 hover:bg-bg-hover transition-colors cursor-pointer border border-primary/30"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-end flex items-center justify-center shadow-lg shadow-primary/30">
                        <CalendarDays size={22} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">Reserveren</span>
                </Link>

                <button
                    onClick={openMeenemen}
                    className="card p-4 flex flex-col items-center gap-3 hover:bg-bg-hover transition-colors cursor-pointer border border-accent/30"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-end flex items-center justify-center shadow-lg shadow-accent/30">
                        <PackagePlus size={22} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">Nu meenemen</span>
                </button>

                <Link
                    to="/melding/nieuw"
                    className="card p-4 flex flex-col items-center gap-3 hover:bg-bg-hover transition-colors cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-error to-red-400 flex items-center justify-center shadow-lg shadow-error/30">
                        <Wrench size={22} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">Melding</span>
                </Link>
            </div>

            {loading ? (
                <LaadIndicator />
            ) : (
                <>
                    {/* Mijn materiaal */}
                    {mijnMateriaal.length > 0 && (
                        <section>
                            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                                Bij mij ({mijnMateriaal.length})
                            </h2>
                            <div className="space-y-2">
                                {mijnMateriaal.map(item => (
                                    <Link
                                        key={item.id}
                                        to={`/item/${item.qr_code}`}
                                        className="card p-4 flex items-center gap-3 hover:bg-bg-hover transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                                            <Package size={18} className="text-accent" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-text-primary truncate">{item.naam}</p>
                                            <p className="text-xs text-text-muted">{item.type}</p>
                                            {deadlines[item.id] && (
                                                <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                                                    <Clock size={11} /> Terugbrengen voor {formatDatum(deadlines[item.id].datum)}
                                                </p>
                                            )}
                                        </div>
                                        <StatusBadge status={item.status} />
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Openstaande meldingen */}
                    {meldingen.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-error" />
                                    Openstaande meldingen ({meldingen.length})
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {meldingen.slice(0, 5).map(m => (
                                    <Link
                                        key={m.id}
                                        to={`/item/${m.materiaal?.qr_code || '#'}`}
                                        className="card p-4 flex items-center gap-3 hover:bg-bg-hover transition-colors border-l-2 border-error"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-text-primary truncate">{m.materiaal?.naam}</p>
                                            <p className="text-xs text-text-secondary">
                                                {m.type_melding === 'kapot' ? 'Iets is kapot' :
                                                    m.type_melding === 'mist' ? 'Onderdeel mist' : 'Verbruiksmateriaal op'}
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                Door {m.gemeld_door_medewerker?.naam} · <DatumTijd tijdstip={m.tijdstip_gemeld} compact />
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* In gebruik bij collega's */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                                    In gebruik bij collega's ({uitgecheckt.filter(i => i.huidige_medewerker_id !== medewerker.id).length})
                                </h2>
                                <p className="text-text-muted text-xs mt-0.5">Materiaal dat nog niet is teruggebracht</p>
                            </div>
                            <Link to="/materiaal" className="text-primary text-sm font-medium">Alles zien</Link>
                        </div>
                        {(() => {
                            const collegas = uitgecheckt.filter(i => i.huidige_medewerker_id !== medewerker.id)
                            return collegas.length === 0 ? (
                                <div className="card p-6 text-center text-text-muted">
                                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Alles is teruggebracht ✓</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {collegas.slice(0, 5).map(item => (
                                        <Link
                                            key={item.id}
                                            to={`/item/${item.qr_code}`}
                                            className="card p-4 flex items-center gap-3 hover:bg-bg-hover transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-text-primary truncate">{item.naam}</p>
                                                <p className="text-xs text-text-muted flex items-center gap-1">
                                                    <User size={11} /> {item.huidige_medewerker?.naam || 'onbekend'}
                                                </p>
                                            </div>
                                            <StatusBadge status="in_gebruik" />
                                        </Link>
                                    ))}
                                </div>
                            )
                        })()}
                    </section>

                    {/* Leeg dashboard melding */}
                    {mijnMateriaal.length === 0 && uitgecheckt.length === 0 && meldingen.length === 0 && (
                        <div className="card p-8 text-center space-y-3">
                            <div className="text-4xl">✨</div>
                            <p className="text-text-primary font-semibold">Alles is op orde!</p>
                            <p className="text-text-muted text-sm">Gebruik de knoppen hierboven om te beginnen</p>
                        </div>
                    )}
                </>
            )}

            {/* Modal: Nu meenemen */}
            {toonMeenemen && (
                <Modal
                    title={meeneemStap === 1 ? 'Nu meenemen' : meeneemStap === 2 ? 'Meenemen' : 'Bevestig met pincode'}
                    onClose={() => setToonMeenemen(false)}
                >
                    {meeneemStap === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-text-secondary text-sm font-medium mb-2">Kies materiaal *</label>
                                <select
                                    className="input"
                                    value={gekozenId}
                                    onChange={e => setGekozenId(e.target.value)}
                                >
                                    <option value="">Selecteer beschikbaar materiaal...</option>
                                    {beschikbaar.map(i => (
                                        <option key={i.id} value={i.id}>{i.naam} — {i.type}</option>
                                    ))}
                                </select>
                            </div>
                            {beschikbaar.length === 0 && (
                                <p className="text-text-muted text-sm text-center">Geen beschikbaar materiaal gevonden</p>
                            )}
                            <button
                                onClick={handleNaarContext}
                                disabled={!gekozenId || resContextLoading}
                                className="btn-primary w-full py-2.5 disabled:opacity-40"
                            >
                                {resContextLoading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                ) : 'Meenemen'}
                            </button>
                        </div>
                    )}

                    {meeneemStap === 2 && resContext && (
                        <div className="space-y-4">
                            <p className="text-text-secondary text-sm">
                                <strong className="text-text-primary">{beschikbaar.find(i => i.id === gekozenId)?.naam}</strong>
                            </p>

                            {/* Scenario A: Eigen reservering */}
                            {resContext.scenario === 'eigen_reservering' && (
                                <div className="rounded-xl p-4 border border-success/30 bg-success/10 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CalendarCheck size={18} className="text-success" />
                                        <p className="text-success text-sm font-semibold">Dit item staat voor jou gereserveerd</p>
                                    </div>
                                    <p className="text-success/80 text-xs">
                                        {formatDatum(resContext.eigenReservering.van_datum)} t/m {formatDatum(resContext.eigenReservering.tot_datum)}
                                        {resContext.eigenReservering.toelichting && ` — ${resContext.eigenReservering.toelichting}`}
                                    </p>
                                    <button
                                        onClick={() => { setGekoppeldeReservering(resContext.eigenReservering); setMeeneemStap(3) }}
                                        className="btn-primary w-full py-2.5 mt-2"
                                    >
                                        Ophalen voor reservering
                                    </button>
                                    <button
                                        onClick={() => { setGekoppeldeReservering(null); setMeeneemStap(3) }}
                                        className="text-text-muted text-xs underline w-full text-center mt-1"
                                    >
                                        Liever ad-hoc meenemen
                                    </button>
                                </div>
                            )}

                            {/* Scenario B: Vrij beschikbaar */}
                            {resContext.scenario === 'ad_hoc_vrij' && (
                                <div className="rounded-xl p-4 border border-overlay/10 bg-bg-hover space-y-2">
                                    <div className="flex items-center gap-2">
                                        <PackagePlus size={18} className="text-text-secondary" />
                                        <p className="text-text-primary text-sm font-semibold">Geen reserveringen — vrij beschikbaar</p>
                                    </div>
                                    <button
                                        onClick={() => { setGekoppeldeReservering(null); setMeeneemStap(3) }}
                                        className="btn-primary w-full py-2.5 mt-2"
                                    >
                                        Meenemen
                                    </button>
                                </div>
                            )}

                            {/* Scenario C: Conflict met reservering van collega */}
                            {resContext.scenario === 'ad_hoc_conflict' && (
                                <div className="rounded-xl p-4 border border-amber-500/40 bg-amber-500/10 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={18} className="text-amber-400" />
                                        <p className="text-amber-400 text-sm font-semibold">
                                            {resContext.eerstvolgendeAnders?.medewerker?.naam || 'Een collega'} heeft dit item gereserveerd
                                        </p>
                                    </div>
                                    <p className="text-amber-400/80 text-xs">
                                        Reservering begint op {formatDatum(resContext.eerstvolgendeAnders?.van_datum)}
                                    </p>
                                    <div className="bg-amber-500/10 rounded-lg p-3 flex items-center gap-2">
                                        <Clock size={16} className="text-amber-300 flex-shrink-0" />
                                        <p className="text-amber-300 text-sm font-semibold">
                                            Breng terug voor: {formatDatum(resContext.terugbrengDeadline)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setGekoppeldeReservering(null); setMeeneemStap(3) }}
                                        className="btn-primary w-full py-2.5 bg-amber-600 hover:bg-amber-700"
                                    >
                                        Ik begrijp het, meenemen
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {meeneemStap === 3 && (
                        <>
                            <div className="mb-4">
                                <p className="text-text-secondary text-sm">
                                    Je neemt <strong className="text-text-primary">{beschikbaar.find(i => i.id === gekozenId)?.naam}</strong> mee
                                    {gekoppeldeReservering ? ' voor je reservering' : ''}.
                                </p>
                                <p className="text-text-muted text-xs mt-1">Bevestig met jouw pincode.</p>
                            </div>
                            <PincodeInvoer
                                onBevestig={handleMeeneemPin}
                                loading={meeneemLoading}
                                error={meeneemFout}
                                label="Jouw pincode"
                            />
                        </>
                    )}
                </Modal>
            )}
        </div>
    )
}
