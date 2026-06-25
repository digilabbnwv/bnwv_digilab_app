import React, { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let _id = 0

/**
 * Eén centraal, voorspelbaar feedback-patroon voor de hele app.
 * Gebruik: const toast = useToast(); toast.succes('Item meegenomen!')
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const verwijder = useCallback((id) => {
        setToasts(ts => ts.filter(t => t.id !== id))
    }, [])

    const toon = useCallback((type, bericht, duur = 3000) => {
        const id = ++_id
        setToasts(ts => [...ts, { id, type, bericht }])
        if (duur) setTimeout(() => verwijder(id), duur)
        return id
    }, [verwijder])

    const api = {
        succes: (bericht, duur) => toon('succes', bericht, duur),
        fout: (bericht, duur) => toon('fout', bericht, duur),
        info: (bericht, duur) => toon('info', bericht, duur),
    }

    return (
        <ToastContext.Provider value={api}>
            {children}
            <Toaster toasts={toasts} onSluit={verwijder} />
        </ToastContext.Provider>
    )
}

const STIJL = {
    succes: { Icon: CheckCircle2, kleur: 'text-success', rand: 'border-success/30' },
    fout: { Icon: AlertCircle, kleur: 'text-error', rand: 'border-error/30' },
    info: { Icon: Info, kleur: 'text-text-secondary', rand: 'border-overlay/15' },
}

function Toaster({ toasts, onSluit }) {
    if (toasts.length === 0) return null
    return (
        <div className="fixed bottom-24 left-0 right-0 z-[90] flex flex-col items-center gap-2 px-4 pointer-events-none">
            {toasts.map(t => {
                const { Icon, kleur, rand } = STIJL[t.type] || STIJL.info
                return (
                    <div
                        key={t.id}
                        role="status"
                        className={`pointer-events-auto w-full max-w-sm bg-bg-surface border ${rand} rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-slideUp`}
                    >
                        <Icon size={18} className={`${kleur} flex-shrink-0`} />
                        <p className="flex-1 text-sm text-text-primary">{t.bericht}</p>
                        <button
                            onClick={() => onSluit(t.id)}
                            className="p-1 -m-1 rounded-lg text-text-muted hover:text-text-primary transition-colors"
                            aria-label="Sluiten"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast moet binnen een ToastProvider gebruikt worden')
    return ctx
}
