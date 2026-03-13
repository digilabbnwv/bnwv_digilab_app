import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase client zodat modules die het importeren niet crashen in tests
vi.mock('./src/lib/supabase', () => ({
    supabase: {
        from: () => ({ select: () => ({ eq: () => ({ gte: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }) }),
        functions: { invoke: () => Promise.resolve({ error: null }) },
    },
}))

vi.mock('./src/lib/agendaSync', () => ({
    syncAgendaAanmaken: vi.fn(),
    syncAgendaAnnuleren: vi.fn(),
}))
