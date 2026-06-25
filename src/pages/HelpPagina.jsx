import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft, ChevronDown, LogIn, Search, QrCode, ArrowUpCircle,
    CalendarCheck, Wrench, BookOpen, KeyRound, HelpCircle, Lightbulb
} from 'lucide-react'

const SECTIES = [
    {
        icon: LogIn,
        titel: 'Inloggen & account',
        inhoud: [
            'Log in met je **e-mailadres** en je **pincode van 5 cijfers**.',
            'Nog geen account? Tik op de loginpagina op **"Account aanmaken"** en vul je naam, e-mailadres en een eigen pincode in.',
            'Je blijft ingelogd op je telefoon, dus je hoeft niet elke keer opnieuw in te loggen.',
        ],
    },
    {
        icon: Search,
        titel: 'Materiaal zoeken',
        inhoud: [
            'Ga naar het tabblad **Materiaal** onderin.',
            'Zoek bovenaan op **naam, type of locatie** (bijv. "VR-bril" of "Ermelo").',
            'Met de filterknoppen kun je snel filteren op **status** (beschikbaar / in gebruik / melding) en op **locatie** (Ermelo of Nunspeet).',
            'Tik op een item om alle details te zien: waar het ligt, wie het heeft, en de beschikbaarheid voor de komende 14 dagen.',
        ],
    },
    {
        icon: QrCode,
        titel: 'QR-code scannen',
        inhoud: [
            'Elke leskist heeft een **QR-sticker** (formaat BNWV-DIGI-...).',
            'Open de **camera-app** van je telefoon en richt op de QR-code.',
            'Tik op de melding die verschijnt — de app opent automatisch de juiste materiaalpagina.',
            'Je hebt dus geen losse scanner-app nodig: de gewone telefooncamera werkt.',
        ],
    },
    {
        icon: ArrowUpCircle,
        titel: 'Meenemen & terugbrengen',
        inhoud: [
            'Open het item (via zoeken of QR-code) en tik op **Meenemen**.',
            'Bevestig met je **pincode** — zo weet de app dat jij het materiaal hebt.',
            'Breng je het terug? Tik op **Terugbrengen**, bevestig met je pincode en kies de **locatie** (Ermelo of Nunspeet).',
            'Heeft een collega het item nog open staan? Dan kun je het **overnemen** — de app vraagt om bevestiging.',
        ],
    },
    {
        icon: CalendarCheck,
        titel: 'Reserveren',
        inhoud: [
            'Wil je zeker zijn dat materiaal beschikbaar is? Ga naar het tabblad **Reserveren**.',
            'Kies het materiaal en de periode (van–tot datum). Je collega\'s zien dan dat het voor jou gereserveerd staat.',
            'Op de itempagina zie je altijd of er een reservering loopt — van jou of van een collega.',
        ],
    },
    {
        icon: Wrench,
        titel: 'Onderhoud melden',
        inhoud: [
            'Is er iets stuk of incompleet? Open het item en tik op **Onderhoudsmelding maken**.',
            'Beschrijf kort wat er aan de hand is. De melding is daarna voor iedereen zichtbaar bij dat item.',
            'Items met een openstaande melding herken je aan het ⚠️-icoon in het materiaaloverzicht.',
        ],
    },
    {
        icon: BookOpen,
        titel: 'Workshops & kalender',
        inhoud: [
            'Onder het tabblad **Workshops** vind je de kalender met geplande workshops.',
            'Tik op een workshop om te zien welk materiaal nodig is, waar en wanneer.',
            'Zo zie je vooraf of materiaal al ergens voor ingepland staat.',
        ],
    },
    {
        icon: KeyRound,
        titel: 'Pincode wijzigen of vergeten',
        inhoud: [
            'Je pincode wijzig je via **Profiel → Pincode wijzigen**. Je voert eerst je oude pincode in en daarna de nieuwe.',
            'Pincode vergeten? Die kun je niet zelf herstellen — neem contact op met de beheerder, die kan je pincode opnieuw instellen.',
        ],
    },
]

function renderTekst(tekst) {
    // Eenvoudige **vet**-opmaak
    const delen = tekst.split(/(\*\*[^*]+\*\*)/g)
    return delen.map((deel, i) => {
        if (deel.startsWith('**') && deel.endsWith('**')) {
            return <strong key={i} className="text-text-primary font-semibold">{deel.slice(2, -2)}</strong>
        }
        return <React.Fragment key={i}>{deel}</React.Fragment>
    })
}

export default function HelpPagina() {
    const navigate = useNavigate()
    const [open, setOpen] = useState(0)

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-secondary transition-colors"
            >
                <ArrowLeft size={18} /> Terug
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-end flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                    <HelpCircle size={22} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary leading-tight">Hulp &amp; uitleg</h1>
                    <p className="text-text-muted text-sm">Hoe werkt de Digilab App?</p>
                </div>
            </div>

            {/* Accordion */}
            <div className="space-y-2">
                {SECTIES.map((sectie, i) => {
                    const Icon = sectie.icon
                    const isOpen = open === i
                    return (
                        <div key={i} className="card overflow-hidden">
                            <button
                                onClick={() => setOpen(isOpen ? -1 : i)}
                                className="w-full flex items-center gap-3 p-4 text-left hover:bg-bg-hover transition-colors"
                                aria-expanded={isOpen}
                            >
                                <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Icon size={18} className="text-primary" />
                                </span>
                                <span className="flex-1 font-medium text-text-primary text-sm">{sectie.titel}</span>
                                <ChevronDown
                                    size={18}
                                    className={`text-text-muted flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {isOpen && (
                                <div className="px-4 pb-4 pt-1 space-y-2 animate-fadeIn">
                                    {sectie.inhoud.map((regel, j) => (
                                        <p key={j} className="text-text-secondary text-sm leading-relaxed pl-12">
                                            {renderTekst(regel)}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Tip-blok */}
            <div className="card p-4 mt-4 flex items-start gap-3 bg-accent/5 border-accent/20">
                <Lightbulb size={18} className="text-accent flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-text-primary text-sm font-medium">Tip: zet de app op je beginscherm</p>
                    <p className="text-text-secondary text-sm mt-0.5 leading-relaxed">
                        Open het deelmenu van je browser en kies <strong className="text-text-primary">"Zet op beginscherm"</strong>.
                        De app opent dan als een echte app, zonder adresbalk.
                    </p>
                </div>
            </div>

            <p className="text-center text-text-muted text-xs mt-6">
                Kom je er niet uit? Neem contact op met de beheerder.
            </p>
        </div>
    )
}
