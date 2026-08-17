import React from 'react'

/**
 * Stat-tegel voor een kerncijfer (KPI). Label boven, groot getal onder,
 * optioneel icoon en hint. Sluit aan op het stat-tile-idioom van de app.
 */
export default function KpiTegel({ label, waarde, hint, icon: Icon }) {
    return (
        <div className="bg-bg-surface rounded-xl border border-overlay/10 p-4">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
                {Icon && <Icon size={14} className="flex-shrink-0" />}
                <span className="text-xs font-medium truncate">{label}</span>
            </div>
            <div className="text-2xl font-bold text-text-primary leading-tight">{waarde}</div>
            {hint && <div className="text-[11px] text-text-muted mt-0.5 truncate">{hint}</div>}
        </div>
    )
}
