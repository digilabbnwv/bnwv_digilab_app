import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { registreer } from '../lib/auth'
import { UserPlus } from 'lucide-react'

export default function RegistratiePagina() {
    const { login } = useAuth()
    const [form, setForm] = useState({ naam: '', email: '', pincode: '', bevestigPin: '' })
    const [loading, setLoading] = useState(false)
    const [fout, setFout] = useState('')

    const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setFout('')

        if (!form.naam.trim()) return setFout('Voer je naam in')
        if (!form.email.includes('@')) return setFout('Voer een geldig e-mailadres in')
        if (form.pincode.length !== 5) return setFout('Je pincode moet 5 cijfers zijn')
        if (form.pincode !== form.bevestigPin) return setFout('Pincodes komen niet overeen')

        setLoading(true)
        try {
            const medewerker = await registreer({
                naam: form.naam.trim(),
                email: form.email.toLowerCase().trim(),
                pincode: form.pincode,
            })
            login(medewerker)
        } catch (err) {
            if (err.code === '23505') {
                setFout('Dit e-mailadres is al geregistreerd')
            } else {
                setFout(err.message || 'Registratie mislukt')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-bg-app relative overflow-hidden">
            <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full bg-accent/8 blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fadeIn">
                {/* Header */}
                <div className="text-center mb-8">
                    <img
                        src="/bnwv_digilab_app/logo-bnwv.png"
                        alt="Bibliotheek Noordwest Veluwe"
                        className="w-14 h-14 object-contain mx-auto mb-4"
                    />
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-end shadow-lg shadow-primary/30 mb-4">
                        <span className="text-2xl font-black text-white">D</span>
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary">Account aanmaken</h1>
                    <p className="text-text-secondary text-sm mt-1">Digilab App — Bibliotheek NWV</p>
                </div>

                <form onSubmit={handleSubmit} className="card p-6 space-y-4">
                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Naam</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Jasper Geertsma"
                            value={form.naam}
                            onChange={e => update('naam', e.target.value)}
                            autoComplete="name"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">E-mailadres</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="naam@bibliotheek.nl"
                            value={form.email}
                            onChange={e => update('email', e.target.value)}
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Pincode (5 cijfers)</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]{5}"
                            maxLength={5}
                            className="input"
                            placeholder="•••••"
                            value={form.pincode}
                            onChange={e => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                            autoComplete="new-password"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-text-secondary text-sm font-medium mb-2">Pincode bevestigen</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]{5}"
                            maxLength={5}
                            className="input"
                            placeholder="•••••"
                            value={form.bevestigPin}
                            onChange={e => update('bevestigPin', e.target.value.replace(/\D/g, '').slice(0, 5))}
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
                        {loading
                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <><UserPlus size={18} /> Account aanmaken</>
                        }
                    </button>
                </form>

                <p className="text-center text-text-muted text-sm mt-6">
                    Al een account?{' '}
                    <Link to="/login" className="text-primary hover:text-primary-end font-medium transition-colors">
                        Inloggen
                    </Link>
                </p>
            </div>
        </div>
    )
}
