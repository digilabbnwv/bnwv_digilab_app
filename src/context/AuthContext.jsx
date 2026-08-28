import { createContext, useContext, useState } from 'react'
import { isBeheerder as checkBeheerder, uitloggen } from '../lib/auth'

const AuthContext = createContext(null)

// Sleutel voor de rol-simulatie ("bekijk als gebruiker"). Puur een UI-hulpmiddel
// voor beheerders om te testen wat een gewone gebruiker ziet — het verandert
// niets in de database en kan rechten alleen afschalen, nooit toekennen.
const SIMULATIE_KEY = 'digilab_simulatie_rol'

function haalOpgeslagenMedewerker() {
    try {
        const opgeslagen = localStorage.getItem('digilab_medewerker')
        return opgeslagen ? JSON.parse(opgeslagen) : null
    } catch {
        localStorage.removeItem('digilab_medewerker')
        return null
    }
}

function haalSimulatieRol() {
    try {
        return localStorage.getItem(SIMULATIE_KEY) || null
    } catch {
        return null
    }
}

export function AuthProvider({ children }) {
    const [medewerker, setMedewerker] = useState(haalOpgeslagenMedewerker)
    const [simulatieRol, setSimulatieRolState] = useState(haalSimulatieRol)
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
        uitloggen()
        setMedewerker(null)
        localStorage.removeItem('digilab_medewerker')
        setSimulatieRolState(null)
        localStorage.removeItem(SIMULATIE_KEY)
    }

    const updateMedewerker = (updates) => {
        const bijgewerkt = { ...medewerker, ...updates }
        setMedewerker(bijgewerkt)
        localStorage.setItem('digilab_medewerker', JSON.stringify(bijgewerkt))
    }

    // Echte rol volgens de database (localStorage sessie).
    const echtIsBeheerder = checkBeheerder(medewerker)

    // Zet of stop de simulatie. Alleen een echte beheerder mag simuleren, en
    // uitsluitend afschalen naar 'medewerker'. Alles anders stopt de simulatie.
    const setSimulatieRol = (rol) => {
        if (echtIsBeheerder && rol === 'medewerker') {
            setSimulatieRolState('medewerker')
            localStorage.setItem(SIMULATIE_KEY, 'medewerker')
        } else {
            setSimulatieRolState(null)
            localStorage.removeItem(SIMULATIE_KEY)
        }
    }

    // Bekijkt de beheerder de app nu bewust als gewone gebruiker?
    const simuleertGebruiker = echtIsBeheerder && simulatieRol === 'medewerker'

    // Effectieve rol die de hele app gebruikt: simulatie schaalt alleen af.
    const isBeheerder = echtIsBeheerder && !simuleertGebruiker

    return (
        <AuthContext.Provider value={{
            medewerker, loading, login, logout, updateMedewerker,
            isBeheerder, echtIsBeheerder, simuleertGebruiker, setSimulatieRol,
        }}>
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
