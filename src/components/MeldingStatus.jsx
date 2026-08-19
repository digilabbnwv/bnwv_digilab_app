import React, { useState } from 'react'
import { MELDING_STATUS_META, MELDING_STATUS_VOLGORDE, meldingStatusLabel } from '../lib/meldingStatus'
import { wijzigStatus } from '../lib/onderhoud'
import { verifyPin } from '../lib/auth'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { foutTekst } from '../lib/foutmelding'
import Modal from './Modal'
import PincodeInvoer from './PincodeInvoer'

/** Compacte statusbadge (nieuw / in behandeling / afgerond). */
export function MeldingStatusBadge({ status, className = '' }) {
    const meta = MELDING_STATUS_META[status] || { label: status, badge: 'bg-overlay/5 text-text-muted border-overlay/10', dot: 'bg-text-muted' }
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.badge} ${className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
        </span>
    )
}

/**
 * Segmented control om de status te wijzigen. Elke wijziging wordt met
 * pincode bevestigd (verantwoording + identiteit van de afronder).
 *
 * @param {object}   melding      - melding met minimaal { id, status }
 * @param {function} onGewijzigd  - callback met de nieuwe status na succes
 */
export function MeldingStatusControl({ melding, onGewijzigd }) {
    const { medewerker } = useAuth()
    const toast = useToast()
    const [doelStatus, setDoelStatus] = useState(null)   // status waarnaar we wijzigen (opent modal)
    const [pinLoading, setPinLoading] = useState(false)
    const [pinFout, setPinFout] = useState('')

    const bevestig = async (pin) => {
        setPinLoading(true)
        setPinFout('')
        try {
            await verifyPin(medewerker.id, pin)
            await wijzigStatus(melding.id, medewerker.id, doelStatus)
            const gekozen = doelStatus
            setDoelStatus(null)
            toast.succes(`Status bijgewerkt naar "${meldingStatusLabel(gekozen)}"`)
            onGewijzigd?.(gekozen)
        } catch (err) {
            setPinFout(foutTekst(err, 'Onjuiste pincode'))
        } finally {
            setPinLoading(false)
        }
    }

    return (
        <>
            <div className="inline-flex rounded-xl bg-bg-app border border-overlay/10 p-1 gap-1">
                {MELDING_STATUS_VOLGORDE.map(s => {
                    const meta = MELDING_STATUS_META[s]
                    const actief = melding.status === s
                    return (
                        <button
                            key={s}
                            type="button"
                            disabled={actief}
                            onClick={() => { setDoelStatus(s); setPinFout('') }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${actief
                                ? `${meta.badge} cursor-default`
                                : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                                }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${actief ? meta.dot : 'bg-current opacity-40'}`} />
                            {meta.label}
                        </button>
                    )
                })}
            </div>

            {doelStatus && (
                <Modal title="Status wijzigen" onClose={() => setDoelStatus(null)}>
                    <div className="mb-4">
                        <p className="text-text-secondary text-sm">
                            Zet de status op <strong className="text-text-primary">{meldingStatusLabel(doelStatus)}</strong>.
                            De aanmaker ontvangt hiervan automatisch bericht.
                        </p>
                        <p className="text-text-muted text-xs mt-1">Bevestig met jouw pincode.</p>
                    </div>
                    <PincodeInvoer
                        onBevestig={bevestig}
                        loading={pinLoading}
                        error={pinFout}
                        label="Jouw pincode"
                    />
                </Modal>
            )}
        </>
    )
}
