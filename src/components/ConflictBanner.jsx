import { AlertTriangle, Ban, CalendarDays, UserCheck, Info } from 'lucide-react'

const iconen = {
    reservering: UserCheck,
    workshop: CalendarDays,
    uitgecheckt: Info,
}

/**
 * Toont conflicten bij het aanmaken van een reservering of workshop.
 *
 * @param {Array} conflicten - Array van { type, beschrijving, ... }
 * @param {'warn'|'block'} mode - warn: amber, doorgaan mogelijk. block: rood, actie geblokkeerd.
 * @param {function} [onDoorgaan] - Callback als gebruiker ondanks waarschuwing doorgaat (alleen bij mode='warn')
 */
export default function ConflictBanner({ conflicten, mode = 'warn', onDoorgaan }) {
    if (!conflicten || conflicten.length === 0) return null

    const isBlock = mode === 'block'
    const heeftWorkshop = conflicten.some(c => c.type === 'workshop')

    return (
        <div className={`rounded-xl border p-4 space-y-2 ${
            isBlock || heeftWorkshop
                ? 'bg-error/10 border-error/30'
                : 'bg-amber-500/10 border-amber-500/30'
        }`}>
            <div className="flex items-center gap-2">
                {isBlock || heeftWorkshop ? (
                    <Ban size={16} className="text-error flex-shrink-0" />
                ) : (
                    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                )}
                <p className={`text-sm font-semibold ${isBlock || heeftWorkshop ? 'text-error' : 'text-amber-400'}`}>
                    {isBlock || heeftWorkshop ? 'Niet beschikbaar' : 'Let op — conflict'}
                </p>
            </div>

            <ul className="space-y-1.5 ml-1">
                {conflicten.map((c, i) => {
                    const Icon = iconen[c.type] || AlertTriangle
                    const isWS = c.type === 'workshop'
                    return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                            <Icon size={14} className={`mt-0.5 flex-shrink-0 ${isWS ? 'text-error' : 'text-text-muted'}`} />
                            <span className={isWS ? 'text-error' : 'text-text-primary'}>
                                {c.beschrijving}
                            </span>
                        </li>
                    )
                })}
            </ul>

            {heeftWorkshop && (
                <p className="text-xs text-error/80 ml-1">
                    Workshops hebben voorrang — je kunt niet reserveren op een workshopdatum.
                </p>
            )}

            {!isBlock && !heeftWorkshop && onDoorgaan && (
                <button
                    type="button"
                    onClick={onDoorgaan}
                    className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
                >
                    Ik begrijp het, toch doorgaan
                </button>
            )}
        </div>
    )
}

/**
 * Groene banner voor als er geen conflicten zijn.
 */
export function BeschikbaarBanner() {
    return (
        <div className="rounded-xl border bg-success/10 border-success/30 p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <p className="text-sm text-success font-medium">Beschikbaar in deze periode</p>
        </div>
    )
}
