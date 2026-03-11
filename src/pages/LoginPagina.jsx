import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { inloggen } from '../lib/auth'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPagina() {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [pincode, setPincode] = useState('')
    const [toonPin, setToonPin] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fout, setFout] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || pincode.length !== 5) {
            setFout('Vul je e-mailadres en 5-cijferige pincode in')
            return
        }
        setLoading(true)
        setFout('')
        try {
            const medewerker = await inloggen({ email, pincode })
            login(medewerker)
        } catch (err) {
            setFout(err.message || 'Inloggen mislukt')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-bg-app relative overflow-hidden">
            {/* Decoratieve cirkels */}
            <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full bg-accent/8 blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fadeIn">
                {/* Logo / Header */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img
                            src="/bnwv_digilab_app/logo-bnwv.png"
                            alt="Bibliotheek Noordwest Veluwe"
                            className="w-12 h-12 object-contain"
                        />
                        <div className="w-px h-10 bg-white/15 rounded-full" />
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-end shadow-lg shadow-primary/30 animate-pulse-glow">
                            <span className="text-xl font-black text-white">D</span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Digilab App</h1>
                    <p className="text-text-secondary text-sm mt-1">Bibliotheek Noordwest Veluwe</p>
                </div>

                {/* Formulier */}
                <form onSubmit={handleSubmit} className="card p-6 space-y-4">
                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">E-mailadres</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="naam@bibliotheek.nl"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setFout('') }}
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Pincode</label>
                        <div className="relative">
                            <input
                                type={toonPin ? 'text' : 'password'}
                                inputMode="numeric"
                                pattern="[0-9]{5}"
                                maxLength={5}
                                className="input pr-12"
                                placeholder="•••••"
                                value={pincode}
                                onChange={e => { setPincode(e.target.value.replace(/\D/g, '').slice(0, 5)); setFout('') }}
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setToonPin(!toonPin)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                            >
                                {toonPin ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
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
                                <LogIn size={18} />
                                Inloggen
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-text-muted text-sm mt-6">
                    Nog geen account?{' '}
                    <Link to="/registratie" className="text-primary hover:text-primary-end font-medium transition-colors">
                        Registreren
                    </Link>
                </p>
            </div>
        </div>
    )
}
