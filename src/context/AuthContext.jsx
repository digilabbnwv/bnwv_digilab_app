import { createContext, useContext, useState } from 'react'
import { isBeheerder as checkBeheerder, herstelJwtSessie, uitloggen as jwtUitloggen } from '../lib/auth'

const AuthContext = createContext(null)

function haalOpgeslagenMedewerker() {
    try {
        // Herstel JWT voor Supabase-verzoeken bij app-start
        herstelJwtSessie()
        const opgeslagen = localStorage.getItem('digilab_medewerker')
        return opgeslagen ? JSON.parse(opgeslagen) : null
    } catch {
        localStorage.removeItem('digilab_medewerker')
        localStorage.removeItem('digilab_jwt')
        return null
    }
}

export function AuthProvider({ children }) {
    const [medewerker, setMedewerker] = useState(haalOpgeslagenMedewerker)
    const loading = false

    const login = (medewerkerData) => {
        // Sla alleen veilige velden op (geen pincode_hash)
        const safeData = {
            id: medewerkerData.id,
            naam: medewerkerData.naam,
            email: medewerkerData.email,
            rol: medewerkerData.rol,
            aangemaakt_op: medewerkerData.aangemaakt_op,
        }
        setMedewerker(safeData)
        localStorage.setItem('digilab_medewerker', JSON.stringify(safeData))
    }

    const logout = () => {
        jwtUitloggen()   // Wis JWT uit memory én localStorage
        setMedewerker(null)
        localStorage.removeItem('digilab_medewerker')
    }

    const updateMedewerker = (updates) => {
        const bijgewerkt = { ...medewerker, ...updates }
        setMedewerker(bijgewerkt)
        localStorage.setItem('digilab_medewerker', JSON.stringify(bijgewerkt))
    }

    const isBeheerder = checkBeheerder(medewerker)

    return (
        <AuthContext.Provider value={{ medewerker, loading, login, logout, updateMedewerker, isBeheerder }}>
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth moet binnen AuthProvider gebruikt worden')
    return ctx
}
