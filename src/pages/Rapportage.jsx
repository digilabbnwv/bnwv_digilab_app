import React from 'react'
import { Link } from 'react-router-dom'
import { Package, CalendarCheck, Wrench, BookOpen, GraduationCap, Users, ChevronRight } from 'lucide-react'

const INGANGEN = [
    {
        key: 'materiaal', titel: 'Materiaalgebruik', to: '/rapportage/materiaal', icon: Package, actief: true,
        omschrijving: 'Wat wordt het meest gebruikt, per categorie en locatie, en wat blijft ongebruikt.',
    },
    {
        key: 'reserveringen', titel: 'Reserveringen', to: '/rapportage/reserveringen', icon: CalendarCheck, actief: true,
        omschrijving: 'Trend over tijd, statusverdeling en annuleringen, per medewerker en doorlooptijd.',
    },
    {
        key: 'onderhoud', titel: 'Onderhoud', to: '/rapportage/onderhoud', icon: Wrench, actief: true,
        omschrijving: 'Meldingen per type, open vs. opgelost, oplostijd en probleemmateriaal.',
    },
    {
        key: 'workshops', titel: 'Workshops', to: '/rapportage/workshops', icon: BookOpen, actief: true,
        omschrijving: 'Geplande workshops over tijd, per locatie, doelgroep en status.',
    },
    {
        key: 'lesbrieven', titel: 'Lesbrieven & Leerlijn', to: '/rapportage/lesbrieven', icon: GraduationCap, actief: true,
        omschrijving: 'Lesbrieven per thema en status, en dekkingsgraad van de leerlijn.',
    },
    {
        key: 'gebruikers', titel: 'Gebruikersactiviteit', to: '/rapportage/gebruikers', icon: Users, actief: true,
        omschrijving: 'Logins, reserveringen en check-outs per medewerker.',
    },
]

export default function Rapportage() {
    return (
        <div className="app-container lg:max-w-5xl pt-8 pb-4 animate-fadeIn">
            <h1 className="text-2xl font-bold text-text-primary mb-1">Rapportages</h1>
            <p className="text-text-muted text-sm mb-6">Kies een onderwerp om de cijfers te bekijken.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {INGANGEN.map((ingang) => {
                    const IconComp = ingang.icon
                    const { key, titel, to, actief, omschrijving } = ingang
                    const inner = (
                        <>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${actief ? 'bg-primary/10 text-primary' : 'bg-bg-hover text-text-muted'}`}>
                                    <IconComp size={20} />
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-semibold text-text-primary truncate">{titel}</span>
                                    {!actief && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg-hover text-text-muted flex-shrink-0">Binnenkort</span>}
                                </div>
                                {actief && <ChevronRight size={18} className="text-text-muted ml-auto flex-shrink-0" />}
                            </div>
                            <p className="text-sm text-text-muted leading-snug">{omschrijving}</p>
                        </>
                    )
                    return actief ? (
                        <Link key={key} to={to} className="card p-4 hover:bg-bg-hover transition-colors">
                            {inner}
                        </Link>
                    ) : (
                        <div key={key} className="card p-4 opacity-60 cursor-default">
                            {inner}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
