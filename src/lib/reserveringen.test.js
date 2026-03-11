import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isActiefVandaag, getEersteActieveReservering } from './reserveringen'

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
