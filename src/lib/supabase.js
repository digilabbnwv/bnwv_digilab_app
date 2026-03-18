import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase omgevingsvariabelen ontbreken. Maak een .env bestand aan.')
}

// Actieve JWT (wordt ingesteld na inloggen / bij app-start via herstelJwtSessie)
let _jwt = null

/** Stel de JWT in voor alle Supabase-verzoeken. */
export function setJwt(jwt) {
    _jwt = jwt
}

/** Wis de JWT (bij uitloggen). */
export function clearJwt() {
    _jwt = null
}

/**
 * Supabase-client met dynamische JWT-injectie.
 * Na setJwt() worden alle DB-queries automatisch geauthenticeerd,
 * zodat RLS-policies auth.uid() en auth.jwt() kunnen gebruiken.
 */
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
        global: {
            fetch: (url, options = {}) => {
                // Alleen JWT injecteren voor PostgREST-calls, niet voor Edge Functions.
                // Edge Functions doen hun eigen auth (medewerker-auth signeert de JWT).
                // Als we de JWT ook naar Edge Functions sturen, blokkeert Supabase
                // de login-aanroep wanneer de opgeslagen JWT verlopen/ongeldig is.
                const isDatabase = typeof url === 'string' && url.includes('/rest/v1/')
                if (_jwt && isDatabase) {
                    options.headers = {
                        ...options.headers,
                        Authorization: `Bearer ${_jwt}`,
                    }
                }
                return fetch(url, options)
            },
        },
    },
)
