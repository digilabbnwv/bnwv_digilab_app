import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
    const [thema, setThema] = useState(() => {
        return localStorage.getItem('digilab_thema') || 'systeem'
    })

    useEffect(() => {
        localStorage.setItem('digilab_thema', thema)

        const root = document.documentElement

        if (thema === 'donker') {
            root.classList.add('dark')
            return
        }

        if (thema === 'licht') {
            root.classList.remove('dark')
            return
        }

        // Systeem: volg OS-voorkeur
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const update = () => {
            if (mediaQuery.matches) {
                root.classList.add('dark')
            } else {
                root.classList.remove('dark')
            }
        }
        update()
        mediaQuery.addEventListener('change', update)
        return () => mediaQuery.removeEventListener('change', update)
    }, [thema])

    return (
        <ThemeContext.Provider value={{ thema, setThema }}>
            {children}
        </ThemeContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme moet binnen ThemeProvider gebruikt worden')
    return ctx
}
