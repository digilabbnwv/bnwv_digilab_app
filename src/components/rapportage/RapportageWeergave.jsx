import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer, BarChart3, Table as TableIcon } from 'lucide-react'
import { LaadIndicator } from '../UI'
import PeriodeFilter from './PeriodeFilter'

/**
 * Layout-shell voor één rapportage-ingang. Bindt periodekiezer, KPI-rij, grafieken
 * en tabel samen met het responsive gedrag:
 *   - Mobiel: toggle tussen grafiek en tabel (één zichtbaar).
 *   - Desktop (lg+): KPI-rij breed, daaronder grafieken (links) en tabel (rechts)
 *     naast elkaar — de schermbreedte wordt benut.
 *
 * @param {string} titel
 * @param {string} preset - actieve periode-preset
 * @param {(p) => void} onPeriodeChange
 * @param {boolean} loading
 * @param {React.ReactNode} kpis - KpiTegel-elementen
 * @param {Array<{titel: string, element: React.ReactNode}>} grafieken
 * @param {React.ReactNode} tabel
 */
export default function RapportageWeergave({
    titel, preset, onPeriodeChange, loading, kpis, grafieken = [], tabel,
    toonPeriode = true, totEinde = false,
}) {
    const [weergave, setWeergave] = useState('grafiek') // mobiele toggle

    return (
        <div className="app-container lg:max-w-6xl pt-8 pb-4 animate-fadeIn">
            {/* Kop */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                    <Link to="/rapportage" className="no-print text-sm text-text-muted hover:text-text-secondary flex items-center gap-1 mb-1">
                        <ArrowLeft size={14} /> Rapportages
                    </Link>
                    <h1 className="text-2xl font-bold text-text-primary truncate">{titel}</h1>
                </div>
                <button
                    onClick={() => window.print()}
                    className="no-print btn-ghost py-2 px-3 text-sm flex items-center gap-2 flex-shrink-0"
                    aria-label="Rapportage afdrukken"
                >
                    <Printer size={16} /> <span className="hidden sm:inline">Print</span>
                </button>
            </div>

            {/* Periodekiezer */}
            {toonPeriode && (
                <div className="no-print mb-4">
                    <PeriodeFilter preset={preset} onChange={onPeriodeChange} totEinde={totEinde} />
                </div>
            )}

            {loading ? (
                <LaadIndicator />
            ) : (
                <>
                    {/* KPI-rij */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                        {kpis}
                    </div>

                    {/* Mobiele toggle grafiek/tabel */}
                    <div className="no-print lg:hidden flex bg-bg-surface border border-overlay/10 rounded-xl p-1 mb-3">
                        <button
                            onClick={() => setWeergave('grafiek')}
                            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-all ${weergave === 'grafiek' ? 'bg-primary text-white' : 'text-text-muted'}`}
                        >
                            <BarChart3 size={15} /> Grafiek
                        </button>
                        <button
                            onClick={() => setWeergave('tabel')}
                            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-all ${weergave === 'tabel' ? 'bg-primary text-white' : 'text-text-muted'}`}
                        >
                            <TableIcon size={15} /> Tabel
                        </button>
                    </div>

                    {/* Grafieken + tabel: gestapeld op mobiel (via toggle), naast elkaar op desktop */}
                    <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-4 lg:items-start">
                        {/* Grafieken */}
                        <div className={`space-y-4 ${weergave === 'grafiek' ? 'block' : 'hidden'} lg:block`}>
                            {grafieken.map((g, i) => (
                                <div key={i} className="bg-bg-surface rounded-xl border border-overlay/10 p-4">
                                    <h3 className="text-sm font-semibold text-text-secondary mb-3">{g.titel}</h3>
                                    {g.element}
                                </div>
                            ))}
                        </div>
                        {/* Tabel */}
                        <div className={`mt-4 lg:mt-0 ${weergave === 'tabel' ? 'block' : 'hidden'} lg:block`}>
                            {tabel}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
