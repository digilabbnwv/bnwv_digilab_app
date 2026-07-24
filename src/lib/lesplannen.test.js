import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./mockDB', () => ({
    mockGetAllLesplannen: vi.fn(),
    mockGetLesplan: vi.fn(),
    mockGetLesplannenVoorWorkshop: vi.fn(),
    mockGetLesplannenVoorMateriaal: vi.fn(),
    mockAddLesplan: vi.fn(),
    mockUpdateLesplan: vi.fn(),
    mockVerwijderLesplan: vi.fn(),
    mockGetAllDoelgroepen: vi.fn(),
    mockGetAllKerndoelen: vi.fn(),
}))

import {
    getAllLesplannen, getLesplan, getLesplannenVoorWorkshop, getLesplannenVoorMateriaal,
    addLesplan, updateLesplan, verwijderLesplan, getAllDoelgroepen, getAllKerndoelen,
} from './lesplannen'
import {
    mockGetAllLesplannen, mockGetLesplan, mockGetLesplannenVoorWorkshop, mockGetLesplannenVoorMateriaal,
    mockAddLesplan, mockUpdateLesplan, mockVerwijderLesplan, mockGetAllDoelgroepen, mockGetAllKerndoelen,
} from './mockDB'

describe('lesplannen.js', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('haalt alle lesplannen op via mockGetAllLesplannen in mock-modus', async () => {
        const lesplannen = [{ id: '1', titel: 'Programmeren met de Micro:bit' }]
        mockGetAllLesplannen.mockReturnValue(lesplannen)

        const result = await getAllLesplannen()

        expect(mockGetAllLesplannen).toHaveBeenCalled()
        expect(result).toBe(lesplannen)
    })

    it('haalt één lesplan op via mockGetLesplan', async () => {
        const lesplan = { id: '1', titel: 'Mediawijsheid' }
        mockGetLesplan.mockReturnValue(lesplan)

        const result = await getLesplan('1')

        expect(mockGetLesplan).toHaveBeenCalledWith('1')
        expect(result).toBe(lesplan)
    })

    it('haalt lesplannen voor een workshop op', async () => {
        const lesplannen = [{ id: '1', titel: 'Programmeren met de Micro:bit' }]
        mockGetLesplannenVoorWorkshop.mockReturnValue(lesplannen)

        const result = await getLesplannenVoorWorkshop('workshop-1')

        expect(mockGetLesplannenVoorWorkshop).toHaveBeenCalledWith('workshop-1')
        expect(result).toBe(lesplannen)
    })

    it('haalt lesplannen voor een materiaal-item op', async () => {
        const lesplannen = [{ id: '1', titel: 'Programmeren met de Micro:bit' }]
        mockGetLesplannenVoorMateriaal.mockReturnValue(lesplannen)

        const result = await getLesplannenVoorMateriaal('mat-1')

        expect(mockGetLesplannenVoorMateriaal).toHaveBeenCalledWith('mat-1')
        expect(result).toBe(lesplannen)
    })

    it('maakt een lesplan aan met koppelingen via mockAddLesplan', async () => {
        const payload = {
            titel: 'Nieuw lesplan', omschrijving: 'Test', bestand_url: '',
            doelgroep_ids: ['d1'], label_ids: ['l1'], kerndoel_ids: ['k1'],
            workshop_template_ids: [], materiaal_ids: [],
        }
        mockAddLesplan.mockReturnValue({ id: '3', ...payload })

        const result = await addLesplan(payload)

        expect(mockAddLesplan).toHaveBeenCalledWith(payload)
        expect(result.titel).toBe('Nieuw lesplan')
    })

    it('werkt een lesplan bij via mockUpdateLesplan', async () => {
        const payload = { titel: 'Bijgewerkt', doelgroep_ids: [], label_ids: [], kerndoel_ids: [], workshop_template_ids: [], materiaal_ids: [] }
        await updateLesplan('1', payload)

        expect(mockUpdateLesplan).toHaveBeenCalledWith('1', payload)
    })

    it('verwijdert een lesplan via mockVerwijderLesplan', async () => {
        await verwijderLesplan('1')

        expect(mockVerwijderLesplan).toHaveBeenCalledWith('1')
    })

    it('haalt doelgroepen op via mockGetAllDoelgroepen', async () => {
        const doelgroepen = [{ id: 'd1', naam: 'Groep 7', volgorde: 7 }]
        mockGetAllDoelgroepen.mockReturnValue(doelgroepen)

        const result = await getAllDoelgroepen()

        expect(mockGetAllDoelgroepen).toHaveBeenCalled()
        expect(result).toBe(doelgroepen)
    })

    it('haalt kerndoelen op met filters via mockGetAllKerndoelen', async () => {
        const kerndoelen = [{ id: 'k1', code: '22A', sector: 'po', vakgebied: 'Digitale geletterdheid' }]
        mockGetAllKerndoelen.mockReturnValue(kerndoelen)

        const result = await getAllKerndoelen({ sector: 'po' })

        expect(mockGetAllKerndoelen).toHaveBeenCalledWith({ sector: 'po' })
        expect(result).toBe(kerndoelen)
    })
})
