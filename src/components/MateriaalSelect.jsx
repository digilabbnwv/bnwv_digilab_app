import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Check, ChevronDown, X } from 'lucide-react'

/**
 * Zoekbare keuzelijst voor materiaal — vervangt een lange native <select>.
 * Geschikt voor mobiel: typen filtert de lijst, tikken selecteert.
 *
 * @param {Array<{id:string, naam:string, type?:string}>} items
 * @param {string} value - geselecteerde id ('' = niets)
 * @param {(id:string) => void} onChange
 * @param {string} [placeholder='Zoek en kies materiaal...']
 */
export default function MateriaalSelect({ items, value, onChange, placeholder = 'Zoek en kies materiaal...' }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const wrapRef = useRef(null)

    const geselecteerd = items.find(i => i.id === value) || null

    const gefilterd = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return items
        return items.filter(i =>
            i.naam?.toLowerCase().includes(q) || i.type?.toLowerCase().includes(q)
        )
    }, [query, items])

    // Sluiten bij klik buiten de component
    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const kies = (id) => {
        onChange(id)
        setOpen(false)
        setQuery('')
    }

    return (
        <div className="relative" ref={wrapRef}>
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="input flex items-center justify-between text-left gap-2"
                >
                    <span className={geselecteerd ? 'text-text-primary truncate' : 'text-text-muted'}>
                        {geselecteerd ? `${geselecteerd.naam}${geselecteerd.type ? ` — ${geselecteerd.type}` : ''}` : placeholder}
                    </span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                        {geselecteerd && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); kies('') }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); kies('') } }}
                                className="p-1 -m-1 text-text-muted hover:text-text-primary"
                                aria-label="Wis keuze"
                            >
                                <X size={16} />
                            </span>
                        )}
                        <ChevronDown size={18} className="text-text-muted" />
                    </span>
                </button>
            ) : (
                <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        autoFocus
                        className="input pl-10"
                        placeholder="Typ om te zoeken..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
            )}

            {open && (
                <div className="absolute z-30 mt-2 w-full max-h-64 overflow-y-auto card p-1 shadow-2xl">
                    {gefilterd.length === 0 ? (
                        <p className="text-text-muted text-sm text-center py-4">Geen materiaal gevonden</p>
                    ) : (
                        gefilterd.map(i => (
                            <button
                                key={i.id}
                                type="button"
                                onClick={() => kies(i.id)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left hover:bg-bg-hover transition-colors min-h-[44px]"
                            >
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm text-text-primary truncate">{i.naam}</span>
                                    {i.type && <span className="block text-xs text-text-muted truncate">{i.type}</span>}
                                </span>
                                {i.id === value && <Check size={16} className="text-primary flex-shrink-0" />}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
