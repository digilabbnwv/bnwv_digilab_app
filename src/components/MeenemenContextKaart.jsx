import React from 'react'
import { CalendarCheck, AlertTriangle, Clock, PackagePlus, CalendarDays } from 'lucide-react'

function formatDatum(d) {
    if (!d) return ''
    const [, m, dag] = d.split('-')
    return `${dag}-${m}`
}

/**
 * Gedeelde reserverings-context bij het meenemen van materiaal.
 * Gebruikt door zowel het dashboard ("Nu meenemen") als de itempagina, zodat de
 * meenemen-flow er overal hetzelfde uitziet en zich hetzelfde gedraagt.
 *
 * @param {{scenario:string, eigenReservering?:object, eerstvolgendeAnders?:object, terugbrengDeadline?:string}} context
 * @param {Array} [workshops=[]] - geplande workshops die als waarschuwing getoond worden
 * @param {boolean} [bezig=false] - knoppen uitschakelen tijdens verwerken
 * @param {(reservering:object|null) => void} onKies - meenemen bevestigen (met of zonder gekoppelde reservering)
 */
export default function MeenemenContextKaart({ context, workshops = [], bezig = false, onKies }) {
    if (!context) return null

    return (
        <div className="space-y-4">
            {/* Scenario A: eigen reservering */}
            {context.scenario === 'eigen_reservering' && (
                <div className="rounded-xl p-4 border border-success/30 bg-success/10 space-y-2">
                    <div className="flex items-center gap-2">
                        <CalendarCheck size={18} className="text-success" />
                        <p className="text-success text-sm font-semibold">Dit materiaal staat voor jou gereserveerd</p>
                    </div>
                    <p className="text-success/80 text-xs">
                        {formatDatum(context.eigenReservering.van_datum)} t/m {formatDatum(context.eigenReservering.tot_datum)}
                        {context.eigenReservering.toelichting && ` — ${context.eigenReservering.toelichting}`}
                    </p>
                    <button onClick={() => onKies(context.eigenReservering)} className="btn-primary w-full py-2.5 mt-2" disabled={bezig}>
                        Ophalen voor reservering
                    </button>
                    <button onClick={() => onKies(null)} className="text-text-muted text-xs underline w-full text-center mt-1 py-2" disabled={bezig}>
                        Liever ad-hoc meenemen
                    </button>
                </div>
            )}

            {/* Scenario B: conflict met reservering van collega */}
            {context.scenario === 'ad_hoc_conflict' && (
                <div className="rounded-xl p-4 border border-amber-500/40 bg-amber-500/10 space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-400" />
                        <p className="text-amber-400 text-sm font-semibold">
                            {context.eerstvolgendeAnders?.medewerker?.naam || 'Een collega'} heeft dit materiaal gereserveerd
                        </p>
                    </div>
                    <p className="text-amber-400/80 text-xs">
                        Reservering begint op {formatDatum(context.eerstvolgendeAnders?.van_datum)}
                    </p>
                    <div className="bg-amber-500/10 rounded-lg p-3 flex items-center gap-2">
                        <Clock size={16} className="text-amber-300 flex-shrink-0" />
                        <p className="text-amber-300 text-sm font-semibold">
                            Breng terug voor: {formatDatum(context.terugbrengDeadline)}
                        </p>
                    </div>
                    <button onClick={() => onKies(null)} className="btn-primary w-full py-2.5 bg-amber-600 hover:bg-amber-700" disabled={bezig}>
                        Ik begrijp het, meenemen
                    </button>
                </div>
            )}

            {/* Scenario C: vrij beschikbaar */}
            {context.scenario === 'ad_hoc_vrij' && (
                <div className="rounded-xl p-4 border border-overlay/10 bg-bg-hover space-y-2">
                    <div className="flex items-center gap-2">
                        <PackagePlus size={18} className="text-text-secondary" />
                        <p className="text-text-primary text-sm font-semibold">Geen reserveringen — vrij beschikbaar</p>
                    </div>
                    <button onClick={() => onKies(null)} className="btn-primary w-full py-2.5 mt-2" disabled={bezig}>
                        Meenemen
                    </button>
                </div>
            )}

            {/* Workshop-waarschuwing (bij elk scenario) */}
            {workshops.length > 0 && (
                <div className="rounded-xl p-4 border border-error/30 bg-error/10 space-y-2">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-error" />
                        <p className="text-error text-sm font-semibold">Binnenkort nodig voor workshop</p>
                    </div>
                    {workshops.map(w => (
                        <p key={w.id} className="text-error/80 text-xs">
                            {w.titel} — {formatDatum(w.datum)} {w.start_tijd?.slice(0, 5)} · {w.locatie}
                        </p>
                    ))}
                    <p className="text-error/60 text-xs">Zorg dat het materiaal op tijd terug is voor de workshop.</p>
                </div>
            )}
        </div>
    )
}
