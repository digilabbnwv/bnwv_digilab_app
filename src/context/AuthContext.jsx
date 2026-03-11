import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [medewerker, setMedewerker] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Herstel sessie uit localStorage
        const opgeslagen = localStorage.getItem('digilab_medewerker')
        if (opgeslagen) {
            try {
                setMedewerker(JSON.parse(opgeslagen))
            } catch {
                localStorage.removeItem('digilab_medewerker')
            }
        }
        setLoading(false)
    }, [])

    const login = (medewerkerData) => {
        setMedewerker(medewerkerData)
        localStorage.setItem('digilab_medewerker', JSON.stringify(medewerkerData))
    }

    const logout = () => {
        setMedewerker(null)
        localStorage.removeItem('digilab_medewerker')
    }

    const updateMedewerker = (updates) => {
        const bijgewerkt = { ...medewerker, ...updates }
        setMedewerker(bijgewerkt)
        localStorage.setItem('digilab_medewerker', JSON.stringify(bijgewerkt))
    }

    return (
        <AuthContext.Provider value={{ medewerker, loading, login, logout, updateMedewerker }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth moet binnen AuthProvider gebruikt worden')
    return ctx
}
