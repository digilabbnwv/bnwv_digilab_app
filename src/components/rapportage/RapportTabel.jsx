import React from 'react'
import { Download, Table as TableIcon } from 'lucide-react'
import { exporteerCSV } from './csvExport'

/**
 * Rapportagetabel met CSV-export. Kolommen definiëren key + label (+ optioneel
 * uitlijning en een render-functie voor weergave).
 *
 * @param {Array<{key, label, align?, render?}>} kolommen
 * @param {Array<Object>} rijen
 */
export default function RapportTabel({ kolommen, rijen, titel, bestandsnaam = 'rapportage' }) {
    return (
        <div className="bg-bg-surface rounded-xl border border-overlay/10 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-1.5">
                    <TableIcon size={15} /> {titel || 'Tabel'}
                </h3>
                <button
                    onClick={() => exporteerCSV(kolommen, rijen, bestandsnaam)}
                    disabled={rijen.length === 0}
                    className="no-print btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 disabled:opacity-40"
                >
                    <Download size={13} /> CSV
                </button>
            </div>
            {rijen.length === 0 ? (
                <p className="text-text-muted text-sm py-6 text-center">Geen gegevens voor deze periode</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-text-muted">
                                {kolommen.map(k => (
                                    <th
                                        key={k.key}
                                        className={`font-medium py-2 px-2 border-b border-overlay/10 ${k.align === 'right' ? 'text-right' : 'text-left'}`}
                                    >
                                        {k.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rijen.map((rij, i) => (
                                <tr key={i} className="hover:bg-bg-hover/50 transition-colors">
                                    {kolommen.map(k => (
                                        <td
                                            key={k.key}
                                            className={`py-2 px-2 border-b border-overlay/5 text-text-primary ${k.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                                        >
                                            {k.render ? k.render(rij[k.key], rij) : (rij[k.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
