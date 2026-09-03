import { Table, LayoutGrid } from 'lucide-react'

const OPTIES = [
    { key: 'tabel', label: 'Tabel' },
    { key: 'tegels', label: 'Tegels' },
]

/**
 * Segmented control om te wisselen tussen tabel- en tegelweergave.
 *
 * @param {string} weergave - huidige waarde ('tabel' | 'tegels')
 * @param {(v: string) => void} onChange
 * @param {string} [className]
 */
export default function WeergaveToggle({ weergave, onChange, className = '' }) {
    return (
        <div
            role="group"
            aria-label="Weergave kiezen"
            className={`inline-flex gap-1 bg-bg-surface border border-overlay/10 rounded-xl p-1 ${className}`}
        >
            {OPTIES.map(({ key, label }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    aria-pressed={weergave === key}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        weergave === key
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-text-muted hover:text-text-secondary'
                    }`}
                >
                    {key === 'tabel' ? <Table size={15} /> : <LayoutGrid size={15} />}
                    {label}
                </button>
            ))}
        </div>
    )
}
