import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { vraagPincodeResetAan } from '../lib/pincodeReset'
import { ArrowLeft, Mail, MailCheck } from 'lucide-react'

export default function PincodeVergeten() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [fout, setFout] = useState('')
    const [verstuurd, setVerstuurd] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email.includes('@')) return setFout('Voer een geldig e-mailadres in')
        setLoading(true)
        setFout('')
        try {
            await vraagPincodeResetAan(email)
            setVerstuurd(true)
        } catch (err) {
            setFout(err.message || 'Aanvraag mislukt')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-bg-app relative overflow-hidden">
            <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full bg-accent/8 blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fadeIn">
                <div className="text-center mb-8">
                    <img
                        src="/bnwv_digilab_app/logo-bnwv.png"
                        alt="Bibliotheek Noordwest Veluwe"
                        className="w-12 h-12 object-contain mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Pincode vergeten</h1>
                    <p className="text-text-secondary text-sm mt-1">We mailen je een link om een nieuwe pincode in te stellen</p>
                </div>

                {verstuurd ? (
                    <div className="card p-6 space-y-4 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/15 text-success mx-auto">
                            <MailCheck size={24} />
                        </div>
                        <p className="text-text-primary text-sm">
                            Als <strong>{email.trim()}</strong> bij ons bekend is, ontvang je binnen enkele
                            minuten een e-mail met een link om een nieuwe pincode in te stellen.
                        </p>
                        <p className="text-text-muted text-xs">
                            De link is 1 uur geldig. Geen e-mail ontvangen? Kijk in je ongewenste e-mail
                            of neem contact op met een beheerder.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
                        <div>
                            <label htmlFor="reset-email" className="block text-text-secondary text-sm font-medium mb-2">E-mailadres</label>
                            <input
                                id="reset-email"
                                type="email"
                                className="input"
                                placeholder="naam@bibliotheek.nl"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setFout('') }}
                                autoComplete="email"
                                autoFocus
                                disabled={loading}
                            />
                        </div>

                        {fout && (
                            <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                                {fout}
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Mail size={18} />
                                    Resetlink versturen
                                </>
                            )}
                        </button>
                    </form>
                )}

                <p className="text-center text-sm mt-6">
                    <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:text-primary-end font-medium transition-colors">
                        <ArrowLeft size={14} />
                        Terug naar inloggen
                    </Link>
                </p>
            </div>
        </div>
    )
}
