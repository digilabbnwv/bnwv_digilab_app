import React from 'react'

export function StatusBadge({ status }) {
    const configs = {
        beschikbaar: { label: 'Beschikbaar', className: 'badge-beschikbaar' },
        in_gebruik: { label: 'In gebruik', className: 'badge-in-gebruik' },
        onderhoud: { label: 'Onderhoud', className: 'badge-onderhoud' },
    }
    const config = configs[status] || configs.beschikbaar
    return <span className={config.className}>{config.label}</span>
}

export function TypeMeldingLabel({ type }) {
    const labels = {
        kapot: 'Iets is kapot',
        mist: 'Onderdeel/accessoire mist',
        verbruiksmateriaal: 'Verbruiksmateriaal op',
        anders: 'Anders',
    }
    return <span>{labels[type] || type}</span>
}

export function DatumTijd({ tijdstip, compact = false }) {
    if (!tijdstip) return <span className="text-text-muted">—</span>
    const datum = new Date(tijdstip)
    if (compact) {
        return <span>{datum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
    }
    return (
        <span>
            {datum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' om '}
            {datum.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </span>
    )
}

export function Spinner({ size = 6 }) {
    return (
        <div className={`w-${size} h-${size} border-2 border-primary border-t-transparent rounded-full animate-spin`} />
    )
}

export function LaadIndicator() {
    return (
        <div className="flex items-center justify-center py-16">
            <Spinner size={8} />
        </div>
    )
}

export function FoutMelding({ bericht }) {
    return (
        <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
            {bericht}
        </div>
    )
}

export function SuccesBericht({ bericht }) {
    return (
        <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-success text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {bericht}
        </div>
    )
}
