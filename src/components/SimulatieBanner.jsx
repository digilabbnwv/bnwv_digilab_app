import React from 'react'
import { Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Balk bovenaan de pagina wanneer een beheerder de app bewust als gewone
 * gebruiker bekijkt. Biedt altijd een directe weg terug naar de beheerdersrol.
 */
export default function SimulatieBanner() {
    const { simuleertGebruiker, setSimulatieRol } = useAuth()
    if (!simuleertGebruiker) return null

    return (
        <div className="no-print bg-accent text-white">
            <div className="app-container flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                    <Eye size={16} className="flex-shrink-0" />
                    <span>Je bekijkt de app als <strong>gewone gebruiker</strong></span>
                </span>
                <button
                    onClick={() => setSimulatieRol(null)}
                    className="flex-shrink-0 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors"
                >
                    Terug naar beheerder
                </button>
            </div>
        </div>
    )
}
