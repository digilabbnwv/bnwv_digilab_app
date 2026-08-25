import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isActiefVandaag, getEersteActieveReservering, wijzigReservering } from './reserveringen'

describe('reserveringen.js util functies', () => {

    // Mock the current date so tests always run consistently
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-03-15T12:00:00Z')) // 'vandaag' is 2026-03-15
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('isActiefVandaag()', () => {
        it('geeft true terug als de huidige datum binnen de reservering valt', () => {
            const reservering = {
                van_datum: '2026-03-10',
                tot_datum: '2026-03-20'
            }
            expect(isActiefVandaag(reservering)).toBe(true)
        })

        it('geeft false terug als de reservering al is afgelopen', () => {
            const reservering = {
                van_datum: '2026-03-01',
                tot_datum: '2026-03-10'
            }
            expect(isActiefVandaag(reservering)).toBe(false)
        })

        it('geeft false terug als de reservering nog moet beginnen', () => {
            const reservering = {
                van_datum: '2026-03-20',
                tot_datum: '2026-03-25'
            }
            expect(isActiefVandaag(reservering)).toBe(false)
        })
    })

    describe('getEersteActieveReservering()', () => {
        it('kiest de eerstvolgende of huidige actieve reservering in de tijdlijn', () => {
            const reserveringen = [
                { id: 1, van_datum: '2026-04-01', tot_datum: '2026-04-05', status: 'actief' }, // komt eraan
                { id: 2, van_datum: '2026-02-01', tot_datum: '2026-02-15', status: 'actief' }, // in het verleden
                { id: 3, van_datum: '2026-03-10', tot_datum: '2026-03-20', status: 'geannuleerd' }, // geldt op dit moment, maar geannuleerd
                { id: 4, van_datum: '2026-03-18', tot_datum: '2026-03-25', status: 'actief' } // geldige aankomende reservering na id=1
            ]
            
            // De functie moet degene kiezen die vanaf nu als eerste voorkomt in actieve status.
            // Dit zou id 4 moeten zijn, want die is na vandaag en eerder dan id 1.
            const resultaat = getEersteActieveReservering(reserveringen)
            
            expect(resultaat).not.toBeNull()
            expect(resultaat.id).toBe(4)
        })

        it('geeft null terug als er geen actieve reserveringen meer in de toekomst of heden zijn', () => {
            const reserveringen = [
                { id: 1, van_datum: '2026-02-01', tot_datum: '2026-02-15', status: 'actief' },
                { id: 2, van_datum: '2026-04-01', tot_datum: '2026-04-05', status: 'geannuleerd' }
            ]
            expect(getEersteActieveReservering(reserveringen)).toBeNull()
        })
    })
})

describe('wijzigReservering() (mock-modus)', () => {
    const STORAGE_KEY = 'digilab_mock_db'

    // Seed een minimale mock-database met 2 medewerkers, 2 materialen en 1 reservering.
    function seed(reserveringOverrides = {}) {
        const db = {
            medewerkers: [
                { id: 'med-1', naam: 'Anna' },
                { id: 'med-2', naam: 'Bram' },
            ],
            materiaal: [
                { id: 'mat-1', naam: 'Sphero Indi', type: 'robot', qr_code: 'BNWV-DIGI-SPHE-0001' },
                { id: 'mat-2', naam: 'Bee-Bot', type: 'robot', qr_code: 'BNWV-DIGI-BEEB-0001' },
            ],
            reserveringen: [
                {
                    id: 'res-1',
                    materiaal_id: 'mat-1',
                    medewerker_id: 'med-1',
                    van_datum: '2026-09-01',
                    tot_datum: '2026-09-03',
                    toelichting: 'Oude toelichting',
                    status: 'actief',
                    aangemaakt_op: '2026-08-01T10:00:00.000Z',
                    ...reserveringOverrides,
                },
            ],
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    }

    function leesReservering(id) {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY))
        return db.reserveringen.find(r => r.id === id)
    }

    beforeEach(() => {
        localStorage.clear()
    })

    it('wijzigt datums, materiaal en toelichting van een eigen actieve reservering', async () => {
        seed()
        const result = await wijzigReservering('res-1', {
            materiaalId: 'mat-2',
            vanDatum: '2026-09-10',
            totDatum: '2026-09-12',
            toelichting: 'Nieuwe toelichting',
        }, 'med-1')

        // Teruggave is verrijkt met materiaal + medewerker
        expect(result.materiaal_id).toBe('mat-2')
        expect(result.materiaal.naam).toBe('Bee-Bot')
        expect(result.van_datum).toBe('2026-09-10')
        expect(result.tot_datum).toBe('2026-09-12')
        expect(result.toelichting).toBe('Nieuwe toelichting')

        // Persistentie: staat ook echt in de opslag
        const opgeslagen = leesReservering('res-1')
        expect(opgeslagen.materiaal_id).toBe('mat-2')
        expect(opgeslagen.van_datum).toBe('2026-09-10')
        expect(opgeslagen.status).toBe('actief')
    })

    it('lege toelichting wordt genormaliseerd naar null', async () => {
        seed()
        const result = await wijzigReservering('res-1', {
            materiaalId: 'mat-1', vanDatum: '2026-09-01', totDatum: '2026-09-03', toelichting: '',
        }, 'med-1')
        expect(result.toelichting).toBeNull()
    })

    it('weigert wijzigen door een andere medewerker dan de eigenaar', async () => {
        seed()
        await expect(
            wijzigReservering('res-1', {
                materiaalId: 'mat-2', vanDatum: '2026-09-10', totDatum: '2026-09-12', toelichting: 'x',
            }, 'med-2')
        ).rejects.toThrow(/eigen reserveringen/i)

        // Origineel is ongewijzigd gebleven
        expect(leesReservering('res-1').materiaal_id).toBe('mat-1')
    })

    it('weigert wijzigen van een reservering die niet meer actief is', async () => {
        seed({ status: 'opgehaald' })
        await expect(
            wijzigReservering('res-1', {
                materiaalId: 'mat-2', vanDatum: '2026-09-10', totDatum: '2026-09-12', toelichting: 'x',
            }, 'med-1')
        ).rejects.toThrow(/niet meer worden gewijzigd/i)
    })

    it('gooit een fout als de reservering niet bestaat', async () => {
        seed()
        await expect(
            wijzigReservering('bestaat-niet', {
                materiaalId: 'mat-2', vanDatum: '2026-09-10', totDatum: '2026-09-12', toelichting: 'x',
            }, 'med-1')
        ).rejects.toThrow(/niet gevonden/i)
    })
})
