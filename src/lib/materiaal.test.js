import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./mockDB', () => ({
    mockGetMateriaalByQR: vi.fn(),
    mockGetMateriaalById: vi.fn(),
    mockGetAllMateriaal: vi.fn(),
    mockGetGearchiveerdMateriaal: vi.fn(),
    mockUitchecken: vi.fn(),
    mockInchecken: vi.fn(),
    mockOverrule: vi.fn(),
    mockGetUitgecheckt: vi.fn(),
    mockGetMijnMateriaal: vi.fn(),
    mockGetMijnTransacties: vi.fn(),
    mockAddMateriaal: vi.fn(),
    mockGetTransacties: vi.fn(),
    mockUpdateMateriaal: vi.fn(),
    mockPreviewCode: vi.fn(),
}))

import { getAllMateriaal, getGearchiveerdMateriaal, archiveerMateriaal, herstelMateriaal } from './materiaal'
import { mockGetAllMateriaal, mockGetGearchiveerdMateriaal, mockUpdateMateriaal } from './mockDB'

describe('materiaal.js — archivering', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('haalt niet-gearchiveerd materiaal op via mockGetAllMateriaal', async () => {
        const items = [{ id: '1', naam: 'Sphero Indi', gearchiveerd: false }]
        mockGetAllMateriaal.mockReturnValue(items)

        const result = await getAllMateriaal()

        expect(mockGetAllMateriaal).toHaveBeenCalled()
        expect(result).toBe(items)
    })

    it('haalt gearchiveerd materiaal op via mockGetGearchiveerdMateriaal', async () => {
        const items = [{ id: '2', naam: 'Oude tablet', gearchiveerd: true }]
        mockGetGearchiveerdMateriaal.mockReturnValue(items)

        const result = await getGearchiveerdMateriaal()

        expect(mockGetGearchiveerdMateriaal).toHaveBeenCalled()
        expect(result).toBe(items)
    })

    it('archiveert materiaal door gearchiveerd op true te zetten', async () => {
        await archiveerMateriaal('mat-1')

        expect(mockUpdateMateriaal).toHaveBeenCalledWith('mat-1', { gearchiveerd: true })
    })

    it('herstelt materiaal door gearchiveerd op false te zetten', async () => {
        await herstelMateriaal('mat-1')

        expect(mockUpdateMateriaal).toHaveBeenCalledWith('mat-1', { gearchiveerd: false })
    })
})
