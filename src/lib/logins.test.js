import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./mockDB', () => ({
    mockLogLogin: vi.fn(),
}))

import { logLogin } from './logins'
import { mockLogLogin } from './mockDB'

describe('logins.js', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('registreert een login via mockLogLogin in mock-modus', async () => {
        await logLogin('medewerker-1')

        expect(mockLogLogin).toHaveBeenCalledWith('medewerker-1')
    })

    it('gooit geen fout door als het registreren van de login mislukt', async () => {
        mockLogLogin.mockImplementation(() => { throw new Error('opslaan mislukt') })
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        await expect(logLogin('medewerker-1')).resolves.not.toThrow()
        expect(consoleSpy).toHaveBeenCalled()

        consoleSpy.mockRestore()
    })
})
