import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { controleerResetToken, herstelPincode } from '../lib/pincodeReset'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LogIn, XCircle } from 'lucide-react'

const alleenCijfers = (v) => v.replace(/\D/g, '').slice(0, 5)

export default function PincodeHerstellen() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token') || ''

    // 'controleren' → 'formulier' | 'ongeldig' → 'gelukt'
    const [fase, setFase] = useState('controleren')
    const [pincode, setPincode] = useState('')
    const [bevestigPin, setBevestigPin] = useState('')
    const [toonPin, setToonPin] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fout, setFout] = useState('')

    useEffect(() => {
        let actief = true
        controleerResetToken(token)
            .then(geldig => { if (actief) setFase(geldig ? 'formulier' : 'ongeldig') })
            .catch(() => { if (actief) setFase('ongeldig') })
        return () => { actief = false }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setFout('')
        if (pincode.length !== 5) return setFout('Je pincode moet 5 cijfers zijn')
        if (pincode !== bevestigPin) return setFout('Pincodes komen niet overeen')

        setLoading(true)
        try {
            await herstelPincode(token, pincode)
            setFase('gelukt')
        } catch (err) {
            setFout(err.message || 'Pincode opslaan mislukt')
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
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Nieuwe pincode instellen</h1>
                    <p className="text-text-secondary text-sm mt-1">Digilab App — Bibliotheek NWV</p>
                </div>

                {fase === 'controleren' && (
                    <div className="card p-6 flex justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {fase === 'ongeldig' && (
                    <div className="card p-6 space-y-4 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-error/15 text-error mx-auto">
                            <XCircle size={24} />
                        </div>
                        <p className="text-text-primary text-sm">
                            Deze link is ongeldig, al gebruikt of verlopen. Vraag een nieuwe link aan.
                        </p>
                        <Link to="/pincode-vergeten" className="btn-primary w-full flex items-center justify-center gap-2">
                            <KeyRound size={18} />
                            Nieuwe link aanvragen
                        </Link>
                    </div>
                )}

                {fase === 'gelukt' && (
                    <div className="card p-6 space-y-4 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/15 text-success mx-auto">
                            <CheckCircle2 size={24} />
                        </div>
                        <p className="text-text-primary text-sm">
                            Je pincode is gewijzigd. Je kunt nu inloggen met je nieuwe pincode.
                        </p>
                        <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                            <LogIn size={18} />
                            Naar inloggen
                        </Link>
                    </div>
                )}

                {fase === 'formulier' && (
                    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
                        <div>
                            <label htmlFor="nieuwe-pin" className="block text-text-secondary text-sm font-medium mb-2">Nieuwe pincode (5 cijfers)</label>
                            <div className="relative">
                                <input
                                    id="nieuwe-pin"
                                    type={toonPin ? 'text' : 'password'}
                                    inputMode="numeric"
                                    pattern="[0-9]{5}"
                                    maxLength={5}
                                    className="input pr-12"
                                    placeholder="•••••"
                                    value={pincode}
                                    onChange={e => { setPincode(alleenCijfers(e.target.value)); setFout('') }}
                                    autoComplete="new-password"
                                    autoFocus
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setToonPin(!toonPin)}
                                    aria-label={toonPin ? 'Pincode verbergen' : 'Pincode tonen'}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-text-muted hover:text-text-secondary transition-colors"
                                >
                                    {toonPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="bevestig-pin" className="block text-text-secondary text-sm font-medium mb-2">Herhaal nieuwe pincode</label>
                            <input
                                id="bevestig-pin"
                                type={toonPin ? 'text' : 'password'}
                                inputMode="numeric"
                                pattern="[0-9]{5}"
                                maxLength={5}
                                className="input"
                                placeholder="•••••"
                                value={bevestigPin}
                                onChange={e => { setBevestigPin(alleenCijfers(e.target.value)); setFout('') }}
                                autoComplete="new-password"
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
                                    <KeyRound size={18} />
                                    Pincode opslaan
                                </>
                            )}
                        </button>
                    </form>
                )}

                {fase !== 'gelukt' && (
                    <p className="text-center text-sm mt-6">
                        <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:text-primary-end font-medium transition-colors">
                            <ArrowLeft size={14} />
                            Terug naar inloggen
                        </Link>
                    </p>
                )}
            </div>
        </div>
    )
}
