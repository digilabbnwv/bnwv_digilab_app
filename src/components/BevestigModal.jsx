import React from 'react'
import Modal from './Modal'

/**
 * Bevestigingsdialoog in de huisstijl — vervangt window.confirm().
 *
 * @param {string} titel
 * @param {React.ReactNode} bericht
 * @param {string} [bevestigLabel='Bevestigen']
 * @param {string} [annuleerLabel='Annuleren']
 * @param {boolean} [gevaarlijk=false] - rode (danger) bevestigknop voor onomkeerbare acties
 * @param {boolean} [loading=false]
 * @param {() => void} onBevestig
 * @param {() => void} onAnnuleer
 */
export default function BevestigModal({
    titel,
    bericht,
    bevestigLabel = 'Bevestigen',
    annuleerLabel = 'Annuleren',
    gevaarlijk = false,
    loading = false,
    onBevestig,
    onAnnuleer,
}) {
    return (
        <Modal title={titel} onClose={onAnnuleer}>
            {bericht && (
                <div className="text-text-secondary text-sm mb-5 leading-relaxed">{bericht}</div>
            )}
            <div className="flex gap-3">
                <button onClick={onAnnuleer} className="btn-ghost flex-1" disabled={loading}>
                    {annuleerLabel}
                </button>
                <button
                    onClick={onBevestig}
                    className={`${gevaarlijk ? 'btn-danger' : 'btn-primary'} flex-1`}
                    disabled={loading}
                >
                    {loading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                        : bevestigLabel}
                </button>
            </div>
        </Modal>
    )
}
