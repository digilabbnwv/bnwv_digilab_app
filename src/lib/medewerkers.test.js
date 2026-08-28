import { describe, it, expect, beforeEach } from 'vitest'
import {
    getAlleMedewerkers, maakMedewerker, updateMedewerker,
    archiveerMedewerker, herstelMedewerker, resetPincode,
} from './medewerkers'
import { inloggen } from './auth'

// Draait in mock-modus (VITE_MOCK_MODE=true in .env): de lib-functies delegeren
// naar de mockDB, die op localStorage werkt.
const STORAGE_KEY = 'digilab_mock_db'

function seedLeeg() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ medewerkers: [], logins: [] }))
}

describe('medewerkers.js (mock-modus)', () => {
    beforeEach(() => {
        localStorage.clear()
        seedLeeg()
    })

    it('maakt een gebruiker aan en geeft geen pincode_hash terug', async () => {
        const m = await maakMedewerker({ naam: 'Test Persoon', email: 'Test@Voorbeeld.NL', rol: 'medewerker', pincode: '12345' })
        expect(m.id).toBeTruthy()
        expect(m.email).toBe('test@voorbeeld.nl') // genormaliseerd
        expect(m.rol).toBe('medewerker')
        expect(m.gearchiveerd).toBe(false)
        expect(m.pincode_hash).toBeUndefined()
    })

    it('weigert een dubbel e-mailadres', async () => {
        await maakMedewerker({ naam: 'A', email: 'dubbel@x.nl', pincode: '11111' })
        await expect(
            maakMedewerker({ naam: 'B', email: 'dubbel@x.nl', pincode: '22222' })
        ).rejects.toThrow(/in gebruik/i)
    })

    it('toont gearchiveerde gebruikers alleen met de vlag', async () => {
        const actief = await maakMedewerker({ naam: 'Actief', email: 'a@x.nl', pincode: '11111' })
        const weg = await maakMedewerker({ naam: 'Weg', email: 'w@x.nl', pincode: '22222' })
        await archiveerMedewerker(weg.id)

        const standaard = await getAlleMedewerkers()
        expect(standaard.map(m => m.id)).toEqual([actief.id])

        const alles = await getAlleMedewerkers({ inclusiefGearchiveerd: true })
        expect(alles.map(m => m.id).sort()).toEqual([actief.id, weg.id].sort())
    })

    it('wijzigt naam, e-mail en rol', async () => {
        const m = await maakMedewerker({ naam: 'Oud', email: 'oud@x.nl', rol: 'medewerker', pincode: '11111' })
        const bij = await updateMedewerker(m.id, { naam: 'Nieuw', email: 'nieuw@x.nl', rol: 'beheerder' })
        expect(bij.naam).toBe('Nieuw')
        expect(bij.email).toBe('nieuw@x.nl')
        expect(bij.rol).toBe('beheerder')
    })

    it('weigert bij bewerken een e-mailadres van een andere gebruiker', async () => {
        await maakMedewerker({ naam: 'Een', email: 'een@x.nl', pincode: '11111' })
        const twee = await maakMedewerker({ naam: 'Twee', email: 'twee@x.nl', pincode: '22222' })
        await expect(
            updateMedewerker(twee.id, { email: 'een@x.nl' })
        ).rejects.toThrow(/in gebruik/i)
    })

    it('blokkeert inloggen voor een gearchiveerde gebruiker en staat het weer toe na herstel', async () => {
        const m = await maakMedewerker({ naam: 'Login', email: 'login@x.nl', pincode: '54321' })

        // Actief: inloggen lukt
        const sessie = await inloggen({ email: 'login@x.nl', pincode: '54321' })
        expect(sessie.id).toBe(m.id)

        // Gearchiveerd: geblokkeerd
        await archiveerMedewerker(m.id)
        await expect(inloggen({ email: 'login@x.nl', pincode: '54321' })).rejects.toThrow(/gedeactiveerd/i)

        // Hersteld: weer toegestaan
        await herstelMedewerker(m.id)
        const opnieuw = await inloggen({ email: 'login@x.nl', pincode: '54321' })
        expect(opnieuw.id).toBe(m.id)
    })

    it('reset de pincode zodat alleen de nieuwe pincode werkt', async () => {
        await maakMedewerker({ naam: 'Pin', email: 'pin@x.nl', pincode: '11111' })
        await resetPincode((await getAlleMedewerkers())[0].id, '99999')

        await expect(inloggen({ email: 'pin@x.nl', pincode: '11111' })).rejects.toThrow(/onjuist/i)
        const sessie = await inloggen({ email: 'pin@x.nl', pincode: '99999' })
        expect(sessie.email).toBe('pin@x.nl')
    })
})
