import { describe, it, expect, beforeEach, vi } from 'vitest'
import { vraagPincodeResetAan, controleerResetToken, herstelPincode, isGeldigePincode } from './pincodeReset'
import { maakMedewerker, archiveerMedewerker } from './medewerkers'
import { inloggen } from './auth'

// Draait in mock-modus (VITE_MOCK_MODE=true in .env): de lib-functies delegeren
// naar de mockDB, die op localStorage werkt.
const STORAGE_KEY = 'digilab_mock_db'

function seedLeeg() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ medewerkers: [], logins: [] }))
}

function resets() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)).pincode_resets || []
}

function laatsteToken() {
    return resets().at(-1)?.token
}

describe('pincodeReset.js (mock-modus)', () => {
    beforeEach(() => {
        localStorage.clear()
        seedLeeg()
        vi.spyOn(console, 'info').mockImplementation(() => {})
    })

    it('valideert een 5-cijferige pincode', () => {
        expect(isGeldigePincode('12345')).toBe(true)
        expect(isGeldigePincode('1234')).toBe(false)
        expect(isGeldigePincode('12a45')).toBe(false)
        expect(isGeldigePincode(undefined)).toBe(false)
    })

    it('weigert een ongeldig e-mailadres', async () => {
        await expect(vraagPincodeResetAan('geen-adres')).rejects.toThrow('geldig e-mailadres')
    })

    it('maakt een token aan en logt de resetlink voor een bekend adres (hoofdletterongevoelig)', async () => {
        await maakMedewerker({ naam: 'Test', email: 'test@voorbeeld.nl', pincode: '11111' })
        await vraagPincodeResetAan('  Test@Voorbeeld.NL ')

        expect(resets()).toHaveLength(1)
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('pincode-herstellen?token='))
        expect(await controleerResetToken(laatsteToken())).toBe(true)
    })

    it('geeft geen fout en maakt geen token aan voor een onbekend adres', async () => {
        await expect(vraagPincodeResetAan('onbekend@voorbeeld.nl')).resolves.toBeUndefined()
        expect(resets()).toHaveLength(0)
    })

    it('maakt geen token aan voor een gedeactiveerde medewerker', async () => {
        const m = await maakMedewerker({ naam: 'Oud', email: 'oud@voorbeeld.nl', pincode: '11111' })
        await archiveerMedewerker(m.id)
        await vraagPincodeResetAan('oud@voorbeeld.nl')
        expect(resets()).toHaveLength(0)
    })

    it('stelt met een geldig token een nieuwe pincode in; oude pincode werkt niet meer', async () => {
        await maakMedewerker({ naam: 'Test', email: 'test@voorbeeld.nl', pincode: '11111' })
        await vraagPincodeResetAan('test@voorbeeld.nl')

        await herstelPincode(laatsteToken(), '22222')

        const ingelogd = await inloggen({ email: 'test@voorbeeld.nl', pincode: '22222' })
        expect(ingelogd.email).toBe('test@voorbeeld.nl')
        await expect(inloggen({ email: 'test@voorbeeld.nl', pincode: '11111' })).rejects.toThrow()
    })

    it('een token is maar één keer te gebruiken', async () => {
        await maakMedewerker({ naam: 'Test', email: 'test@voorbeeld.nl', pincode: '11111' })
        await vraagPincodeResetAan('test@voorbeeld.nl')
        const token = laatsteToken()

        await herstelPincode(token, '22222')
        expect(await controleerResetToken(token)).toBe(false)
        await expect(herstelPincode(token, '33333')).rejects.toThrow('ongeldig of verlopen')
    })

    it('een nieuwe aanvraag maakt eerdere links ongeldig', async () => {
        await maakMedewerker({ naam: 'Test', email: 'test@voorbeeld.nl', pincode: '11111' })
        await vraagPincodeResetAan('test@voorbeeld.nl')
        const eerste = laatsteToken()
        await vraagPincodeResetAan('test@voorbeeld.nl')

        expect(await controleerResetToken(eerste)).toBe(false)
        expect(await controleerResetToken(laatsteToken())).toBe(true)
    })

    it('weigert een verlopen token', async () => {
        await maakMedewerker({ naam: 'Test', email: 'test@voorbeeld.nl', pincode: '11111' })
        await vraagPincodeResetAan('test@voorbeeld.nl')
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY))
        db.pincode_resets[0].verloopt_op = new Date(Date.now() - 1000).toISOString()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db))

        expect(await controleerResetToken(db.pincode_resets[0].token)).toBe(false)
        await expect(herstelPincode(db.pincode_resets[0].token, '22222')).rejects.toThrow('ongeldig of verlopen')
    })

    it('weigert een ongeldige nieuwe pincode of ontbrekend token', async () => {
        await expect(herstelPincode('abc', '123')).rejects.toThrow('5 cijfers')
        await expect(herstelPincode('', '12345')).rejects.toThrow('ongeldig of verlopen')
        expect(await controleerResetToken('')).toBe(false)
        expect(await controleerResetToken('bestaat-niet')).toBe(false)
    })
})
