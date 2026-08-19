import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    telGebruikPerItem, telGebruikPerCategorie, telGebruikPerLocatie,
    telPerStatus, telPerMedewerker, trendPerPeriode, gemDoorlooptijd, bepaalOngebruikt,
    telMeldingenPerType, telMeldingenPerStatus, telMeldingenPerMateriaal, gemOplostijd,
    gemMeldingDoorlooptijd, meldingenAchterstand,
    telWorkshopsPerStatus, telWorkshopsPer,
    telLesplannenPerStatus, telLesplannenPerThema, telLesplannenPerDoelgroep, berekenDekkingsgraad,
    activiteitPerMedewerker,
} from './rapportage'

describe('rapportage.js aggregatiefuncties', () => {

    describe('telGebruikPerItem()', () => {
        it('telt uitsluitend uitchecken-transacties en sorteert aflopend', () => {
            const tx = [
                { materiaal_id: 'a', type: 'uitchecken', materiaal: { naam: 'Sphero' } },
                { materiaal_id: 'a', type: 'uitchecken', materiaal: { naam: 'Sphero' } },
                { materiaal_id: 'b', type: 'uitchecken', materiaal: { naam: 'Ozobot' } },
                { materiaal_id: 'a', type: 'inchecken', materiaal: { naam: 'Sphero' } },
                { materiaal_id: 'a', type: 'overrule', materiaal: { naam: 'Sphero' } },
                { materiaal_id: 'b', type: 'locatiewijziging', materiaal: { naam: 'Ozobot' } },
            ]
            const res = telGebruikPerItem(tx)
            expect(res).toEqual([
                { id: 'a', naam: 'Sphero', aantal: 2 },
                { id: 'b', naam: 'Ozobot', aantal: 1 },
            ])
        })

        it('geeft lege array bij geen uitchecks', () => {
            expect(telGebruikPerItem([{ materiaal_id: 'a', type: 'inchecken' }])).toEqual([])
        })
    })

    describe('telGebruikPerCategorie()', () => {
        it('groepeert op categorie_prefix met leesbaar label', () => {
            const tx = [
                { type: 'uitchecken', materiaal: { categorie_prefix: 'SPHE' } },
                { type: 'uitchecken', materiaal: { categorie_prefix: 'SPHE' } },
                { type: 'uitchecken', materiaal: { categorie_prefix: 'OZOB' } },
                { type: 'inchecken', materiaal: { categorie_prefix: 'SPHE' } },
            ]
            const res = telGebruikPerCategorie(tx)
            expect(res[0]).toEqual({ prefix: 'SPHE', label: 'Sphero', aantal: 2 })
            expect(res[1]).toEqual({ prefix: 'OZOB', label: 'Ozobot', aantal: 1 })
        })
    })

    describe('telGebruikPerLocatie()', () => {
        it('gebruikt de standaard_locatie van het materiaal', () => {
            const tx = [
                { type: 'uitchecken', materiaal: { standaard_locatie: 'Ermelo' } },
                { type: 'uitchecken', materiaal: { standaard_locatie: 'Ermelo' } },
                { type: 'uitchecken', materiaal: { standaard_locatie: 'Nunspeet' } },
            ]
            expect(telGebruikPerLocatie(tx)).toEqual([
                { locatie: 'Ermelo', aantal: 2 },
                { locatie: 'Nunspeet', aantal: 1 },
            ])
        })
    })

    describe('telPerStatus()', () => {
        it('voegt opgehaald en teruggebracht samen', () => {
            const res = telPerStatus([
                { status: 'actief' },
                { status: 'opgehaald' },
                { status: 'teruggebracht' },
                { status: 'teruggebracht' },
                { status: 'geannuleerd' },
            ])
            expect(res).toEqual({ actief: 1, opgehaald: 3, geannuleerd: 1 })
        })
    })

    describe('telPerMedewerker()', () => {
        it('telt reserveringen per medewerker, aflopend', () => {
            const res = telPerMedewerker([
                { medewerker_id: '1', medewerker: { naam: 'Lisa' } },
                { medewerker_id: '2', medewerker: { naam: 'Jasper' } },
                { medewerker_id: '1', medewerker: { naam: 'Lisa' } },
            ])
            expect(res).toEqual([
                { id: '1', naam: 'Lisa', aantal: 2 },
                { id: '2', naam: 'Jasper', aantal: 1 },
            ])
        })
    })

    describe('bepaalOngebruikt()', () => {
        beforeEach(() => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2026-08-17T12:00:00Z'))
        })
        afterEach(() => vi.useRealTimers())

        it('markeert items zonder gebruik in >90 dagen, inclusief nooit gebruikt', () => {
            const materiaal = [
                { id: 'recent', naam: 'Recent' },
                { id: 'oud', naam: 'Oud' },
                { id: 'nooit', naam: 'Nooit' },
            ]
            const laatste = new Map([
                ['recent', '2026-08-01T00:00:00Z'], // binnen 90 dagen
                ['oud', '2026-01-01T00:00:00Z'],    // ouder dan 90 dagen
            ])
            const res = bepaalOngebruikt(materiaal, laatste)
            const ids = res.map(r => r.id)
            expect(ids).toContain('oud')
            expect(ids).toContain('nooit')
            expect(ids).not.toContain('recent')
        })
    })

    describe('gemDoorlooptijd()', () => {
        it('koppelt via reservering_id en middelt in afgeronde uren', () => {
            const reserveringen = [
                { id: 'r1', aangemaakt_op: '2026-03-01T10:00:00Z' },
                { id: 'r2', aangemaakt_op: '2026-03-02T10:00:00Z' },
            ]
            const transacties = [
                { type: 'uitchecken', reservering_id: 'r1', tijdstip: '2026-03-01T12:00:00Z' }, // 2 uur
                { type: 'uitchecken', reservering_id: 'r2', tijdstip: '2026-03-02T14:00:00Z' }, // 4 uur
            ]
            expect(gemDoorlooptijd(reserveringen, transacties)).toBe(3)
        })

        it('geeft null als er geen gekoppelde uitchecks zijn', () => {
            const reserveringen = [{ id: 'r1', aangemaakt_op: '2026-03-01T10:00:00Z' }]
            expect(gemDoorlooptijd(reserveringen, [])).toBeNull()
        })
    })

    describe('trendPerPeriode()', () => {
        it('bucket per week (maandag) chronologisch', () => {
            const res = trendPerPeriode([
                { aangemaakt_op: '2026-08-03T09:00:00Z' }, // week van ma 3 aug
                { aangemaakt_op: '2026-08-05T09:00:00Z' }, // zelfde week
                { aangemaakt_op: '2026-08-11T09:00:00Z' }, // week van ma 10 aug
            ], 'week')
            expect(res.map(r => ({ key: r.key, aantal: r.aantal }))).toEqual([
                { key: '2026-08-03', aantal: 2 },
                { key: '2026-08-10', aantal: 1 },
            ])
        })

        it('bucket per maand', () => {
            const res = trendPerPeriode([
                { aangemaakt_op: '2026-07-15T09:00:00Z' },
                { aangemaakt_op: '2026-08-01T09:00:00Z' },
                { aangemaakt_op: '2026-08-20T09:00:00Z' },
            ], 'maand')
            expect(res.map(r => ({ key: r.key, aantal: r.aantal }))).toEqual([
                { key: '2026-07', aantal: 1 },
                { key: '2026-08', aantal: 2 },
            ])
        })

        it('bucket op een ander datumveld (bijv. workshops op datum)', () => {
            const res = trendPerPeriode([
                { datum: '2026-08-01T00:00:00Z' },
                { datum: '2026-09-10T00:00:00Z' },
            ], 'maand', 'datum')
            expect(res.map(r => r.key)).toEqual(['2026-08', '2026-09'])
        })
    })

    describe('onderhoud-aggregaties', () => {
        const meldingen = [
            // gemeld → in behandeling (24u) → afgerond (totaal 48u)
            { materiaal_id: 'a', type_melding: 'kapot', status: 'afgerond', materiaal: { naam: 'Sphero' }, tijdstip_gemeld: '2026-08-01T10:00:00Z', tijdstip_in_behandeling: '2026-08-02T10:00:00Z', tijdstip_opgelost: '2026-08-03T10:00:00Z' },
            { materiaal_id: 'a', type_melding: 'mist', status: 'nieuw', materiaal: { naam: 'Sphero' } },
            // gemeld → in behandeling (4u) → afgerond (totaal 12u)
            { materiaal_id: 'b', type_melding: 'kapot', status: 'afgerond', materiaal: { naam: 'Ozobot' }, tijdstip_gemeld: '2026-08-01T10:00:00Z', tijdstip_in_behandeling: '2026-08-01T14:00:00Z', tijdstip_opgelost: '2026-08-01T22:00:00Z' },
            { materiaal_id: 'c', type_melding: 'anders', status: 'in_behandeling', materiaal: { naam: 'Beebot' } },
        ]
        it('telt per type', () => {
            expect(telMeldingenPerType(meldingen)).toEqual([
                { type: 'kapot', label: 'Kapot', aantal: 2 },
                { type: 'mist', label: 'Mist onderdeel', aantal: 1 },
                { type: 'anders', label: 'Anders', aantal: 1 },
            ])
        })
        it('telt per status (drie fasen)', () => {
            expect(telMeldingenPerStatus(meldingen)).toEqual({ nieuw: 1, in_behandeling: 1, afgerond: 2 })
        })
        it('telt per materiaal (probleemmateriaal)', () => {
            expect(telMeldingenPerMateriaal(meldingen)[0]).toEqual({ id: 'a', naam: 'Sphero', aantal: 2 })
        })
        it('middelt totale oplostijd van afgeronde meldingen in uren', () => {
            expect(gemOplostijd(meldingen)).toBe(30) // (48 + 12) / 2
        })
        it('middelt doorlooptijd per fase', () => {
            expect(gemMeldingDoorlooptijd(meldingen)).toEqual({
                naarInBehandeling: 14, // (24 + 4) / 2
                naarAfgerond: 16,      // (24 + 8) / 2
            })
        })
        it('signaleert meldingen die te lang open staan', () => {
            const nu = new Date('2026-08-20T10:00:00Z').getTime()
            const rijen = [
                { id: 'x', status: 'nieuw', tijdstip_gemeld: '2026-08-01T10:00:00Z', materiaal: { naam: 'Sphero' } }, // 19d nieuw
                { id: 'y', status: 'nieuw', tijdstip_gemeld: '2026-08-19T10:00:00Z', materiaal: { naam: 'Ozobot' } }, // 1d — binnen norm
                { id: 'z', status: 'in_behandeling', tijdstip_gemeld: '2026-08-01T10:00:00Z', tijdstip_in_behandeling: '2026-08-02T10:00:00Z', materiaal: { naam: 'Beebot' } }, // 18d in behandeling
                { id: 'w', status: 'afgerond', tijdstip_gemeld: '2026-07-01T10:00:00Z', materiaal: { naam: 'Lego' } }, // afgerond telt niet
            ]
            const res = meldingenAchterstand(rijen, { nieuw: 3, in_behandeling: 7 }, nu)
            expect(res.map(r => r.id)).toEqual(['x', 'z']) // aflopend op dagen
            expect(res[0]).toMatchObject({ id: 'x', status: 'nieuw', materiaal: 'Sphero', dagen: 19 })
        })
    })

    describe('workshop-aggregaties', () => {
        const ws = [
            { status: 'gepubliceerd', locatie: 'Ermelo', doelgroep: '8-12 jr' },
            { status: 'gepubliceerd', locatie: 'Ermelo', doelgroep: '12+' },
            { status: 'concept', locatie: 'Nunspeet', doelgroep: '8-12 jr' },
            { status: 'geannuleerd', locatie: 'Nunspeet', doelgroep: '8-12 jr' },
        ]
        it('telt per status', () => {
            expect(telWorkshopsPerStatus(ws)).toEqual({ concept: 1, gepubliceerd: 2, geannuleerd: 1 })
        })
        it('groepeert op een veld', () => {
            expect(telWorkshopsPer(ws, 'locatie')).toEqual([
                { sleutel: 'Ermelo', aantal: 2 },
                { sleutel: 'Nunspeet', aantal: 2 },
            ])
            expect(telWorkshopsPer(ws, 'doelgroep')[0]).toEqual({ sleutel: '8-12 jr', aantal: 3 })
        })
    })

    describe('lesbrieven-aggregaties', () => {
        const lesplannen = [
            { status: 'gepubliceerd', themas: [{ naam: 'Programmeren' }], doelgroepen: [{ naam: 'Groep 5', volgorde: 5 }] },
            { status: 'gepubliceerd', themas: [{ naam: 'Programmeren' }, { naam: 'Robotica' }], doelgroepen: [{ naam: 'Groep 3', volgorde: 3 }] },
            { status: 'concept', themas: [], doelgroepen: [] },
        ]
        it('telt per status', () => {
            expect(telLesplannenPerStatus(lesplannen)).toEqual({ concept: 1, gepubliceerd: 2 })
        })
        it('telt per thema (meervoudig)', () => {
            expect(telLesplannenPerThema(lesplannen)).toEqual([
                { naam: 'Programmeren', kleur: null, aantal: 2 },
                { naam: 'Robotica', kleur: null, aantal: 1 },
            ])
        })
        it('telt per doelgroep gesorteerd op volgorde', () => {
            expect(telLesplannenPerDoelgroep(lesplannen).map(d => d.naam)).toEqual(['Groep 3', 'Groep 5'])
        })
        it('berekent dekkingsgraad uit de leerlijnmatrix', () => {
            const matrix = { rijen: [1, 2], kolommen: [1, 2], cellen: { 'a|b': [], 'c|d': [], 'e|f': [] } }
            expect(berekenDekkingsgraad(matrix)).toEqual({ gedekt: 3, totaal: 4, percentage: 75 })
        })
    })

    describe('activiteitPerMedewerker()', () => {
        it('combineert logins, reserveringen en check-outs per medewerker', () => {
            const medewerkers = [{ id: '1', naam: 'Jasper' }, { id: '2', naam: 'Lisa' }]
            const logins = [
                { medewerker_id: '1', tijdstip: '2026-08-01T10:00:00Z' },
                { medewerker_id: '1', tijdstip: '2026-08-05T10:00:00Z' },
            ]
            const reserveringen = [{ medewerker_id: '2' }]
            const transacties = [
                { medewerker_id: '1', type: 'uitchecken' },
                { medewerker_id: '2', type: 'inchecken' },
            ]
            const res = activiteitPerMedewerker(medewerkers, { logins, reserveringen, transacties })
            expect(res[0]).toEqual({ id: '1', naam: 'Jasper', logins: 2, reserveringen: 0, checkouts: 1, laatsteLogin: '2026-08-05T10:00:00Z' })
            expect(res[1]).toEqual({ id: '2', naam: 'Lisa', logins: 0, reserveringen: 1, checkouts: 0, laatsteLogin: null })
        })
    })
})
