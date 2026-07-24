import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getOpenMeldingen } from '../lib/onderhoud'

function initialen(naam) {
    if (!naam) return '?'
    return naam.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function AppHeader() {
    const { medewerker } = useAuth()
    const [aantalMeldingen, setAantalMeldingen] = useState(0)

    useEffect(() => {
        getOpenMeldingen()
            .then(data => setAantalMeldingen((data || []).length))
            .catch(console.error)
    }, [])

    return (
        <header className="no-print sticky top-0 z-40 bg-bg-surface/95 backdrop-blur-xl border-b border-overlay/10">
            <div className="app-container flex items-center justify-end gap-2 py-2.5">
                <Link
                    to="/melding"
                    className="relative p-2 rounded-xl text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
                    aria-label={`Meldingen${aantalMeldingen > 0 ? ` (${aantalMeldingen} open)` : ''}`}
                >
                    <Bell size={19} />
                    {aantalMeldingen > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-error text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                            {aantalMeldingen > 9 ? '9+' : aantalMeldingen}
                        </span>
                    )}
                </Link>
                <Link
                    to="/profiel"
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-end flex items-center justify-center text-white text-xs font-bold shadow-md shadow-primary/20"
                    aria-label="Profiel"
                >
                    {initialen(medewerker?.naam)}
                </Link>
            </div>
        </header>
    )
}
