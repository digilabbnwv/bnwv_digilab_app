import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./mockDB', () => ({
    mockGetAllLabels: vi.fn(),
    mockAddLabel: vi.fn(),
    mockUpdateLabel: vi.fn(),
    mockDeleteLabel: vi.fn(),
    mockGetLabelsVoorMateriaal: vi.fn(),
    mockSetLabelsVoorMateriaal: vi.fn(),
}))

import {
    getAllLabels, addLabel, updateLabel, deleteLabel,
    getLabelsVoorMateriaal, setLabelsVoorMateriaal,
} from './labels'
import {
    mockGetAllLabels, mockAddLabel, mockUpdateLabel, mockDeleteLabel,
    mockGetLabelsVoorMateriaal, mockSetLabelsVoorMateriaal,
} from './mockDB'

describe('labels.js', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('haalt alle labels op via mockGetAllLabels in mock-modus', async () => {
        const labels = [{ id: '1', naam: 'Digitaal', kleur: '#E8772E' }]
        mockGetAllLabels.mockReturnValue(labels)

        const result = await getAllLabels()

        expect(mockGetAllLabels).toHaveBeenCalled()
        expect(result).toBe(labels)
    })

    it('maakt een label aan via mockAddLabel', async () => {
        mockAddLabel.mockReturnValue({ id: '2', naam: 'Leesbevordering', kleur: '#F59E0B' })

        const result = await addLabel({ naam: 'Leesbevordering', kleur: '#F59E0B' })

        expect(mockAddLabel).toHaveBeenCalledWith({ naam: 'Leesbevordering', kleur: '#F59E0B' })
        expect(result.naam).toBe('Leesbevordering')
    })

    it('werkt een label bij via mockUpdateLabel', async () => {
        await updateLabel('1', { naam: 'Nieuwe naam' })

        expect(mockUpdateLabel).toHaveBeenCalledWith('1', { naam: 'Nieuwe naam' })
    })

    it('verwijdert een label via mockDeleteLabel', async () => {
        await deleteLabel('1')

        expect(mockDeleteLabel).toHaveBeenCalledWith('1')
    })

    it('haalt labels voor een materiaal-item op via mockGetLabelsVoorMateriaal', async () => {
        const labels = [{ id: '1', naam: 'Digitaal' }]
        mockGetLabelsVoorMateriaal.mockReturnValue(labels)

        const result = await getLabelsVoorMateriaal('mat-1')

        expect(mockGetLabelsVoorMateriaal).toHaveBeenCalledWith('mat-1')
        expect(result).toBe(labels)
    })

    it('koppelt labels aan een materiaal-item via mockSetLabelsVoorMateriaal', async () => {
        await setLabelsVoorMateriaal('mat-1', ['1', '2'])

        expect(mockSetLabelsVoorMateriaal).toHaveBeenCalledWith('mat-1', ['1', '2'])
    })
})
