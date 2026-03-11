import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUitgechecktMateriaal, getMijnMateriaal } from '../lib/materiaal'
import { getOpenMeldingen } from '../lib/onderhoud'
import { StatusBadge, LaadIndicator, DatumTijd } from '../components/UI'
import { QrCode, Wrench, Package, AlertTriangle, ChevronRight, User } from 'lucide-react'

export default function Dashboard() {
    const { medewerker } = useAuth()
    const navigate = useNavigate()
    const [uitgecheckt, setUitgecheckt] = useState([])
    const [mijnMateriaal, setMijnMateriaal] = useState([])
    const [meldingen, setMeldingen] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        laden()
    }, [])

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
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
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
            <div className="grid grid-cols-2 gap-3">
                <Link
                    to="/item/scan"
                    className="card p-4 flex flex-col items-center gap-3 hover:bg-bg-hover transition-colors cursor-pointer border border-primary/30"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-end flex items-center justify-center shadow-lg shadow-primary/30">
                        <QrCode size={22} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">Scan QR</span>
                </Link>

                <Link
                    to="/melding"
                    className="card p-4 flex flex-col items-center gap-3 hover:bg-bg-hover transition-colors cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-end flex items-center justify-center shadow-lg shadow-accent/30">
                        <Wrench size={22} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">Melding maken</span>
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
                            <p className="text-text-muted text-sm">Scan een QR-code om te beginnen</p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
