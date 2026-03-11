import React, { useState, useRef, useEffect } from 'react'
import { Delete } from 'lucide-react'

export default function PincodeInvoer({ onBevestig, label = 'Voer je 5-cijferige pincode in', loading = false, error = null }) {
    const [pin, setPin] = useState(['', '', '', '', ''])
    const inputs = useRef([])

    useEffect(() => {
        inputs.current[0]?.focus()
    }, [])

    const handleChange = (index, value) => {
        if (!/^\d?$/.test(value)) return
        const nieuw = [...pin]
        nieuw[index] = value
        setPin(nieuw)
        if (value && index < 4) {
            inputs.current[index + 1]?.focus()
        }
        if (nieuw.every(d => d !== '') && nieuw[4] !== '') {
            setTimeout(() => onBevestig(nieuw.join('')), 100)
        }
    }

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (pin[index]) {
                const nieuw = [...pin]
                nieuw[index] = ''
                setPin(nieuw)
            } else if (index > 0) {
                inputs.current[index - 1]?.focus()
                const nieuw = [...pin]
                nieuw[index - 1] = ''
                setPin(nieuw)
            }
        }
    }

    const handlePaste = (e) => {
        const tekst = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5)
        if (tekst.length === 5) {
            const chars = tekst.split('')
            setPin(chars)
            onBevestig(tekst)
        }
    }

    const wissen = () => {
        setPin(['', '', '', '', ''])
        inputs.current[0]?.focus()
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <p className="text-text-secondary text-sm text-center">{label}</p>
            <div className="flex gap-3">
                {pin.map((digit, i) => (
                    <input
                        key={i}
                        ref={el => inputs.current[i] = el}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        className={`pin-input ${error ? 'border-error' : digit ? 'border-primary' : ''}`}
                        disabled={loading}
                    />
                ))}
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <button onClick={wissen} className="text-text-muted text-sm flex items-center gap-1 hover:text-text-secondary">
                <Delete size={14} /> Wissen
            </button>
        </div>
    )
}
