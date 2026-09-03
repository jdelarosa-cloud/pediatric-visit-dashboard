import { describe, expect, it } from 'vitest'
import type { ColumnIndexes } from './headers.ts'
import { normalizeRow } from './normalizeRow.ts'

const INDEXES: ColumnIndexes = {
  visit_id: 0,
  patient_id_hashed: 1,
  location: 2,
  visit_date: 3,
  visit_reason: 4,
  wait_time_minutes: 5,
  provider_id: 6,
}

const VALID = ['V001', 'h-001', 'Bethesda, MD', '2026-07-01', 'Fever', '25', 'DR1']

function withCell(index: number, value: string): string[] {
  const cells = [...VALID]
  cells[index] = value
  return cells
}

describe('normalizeRow', () => {
  it('accepts a fully valid row with no normalizations', () => {
    const result = normalizeRow(VALID, INDEXES, 1)
    expect(result).toEqual({
      kind: 'accepted',
      visit: {
        visitId: 'V001',
        patientIdHashed: 'h-001',
        location: 'Bethesda, MD',
        visitDate: '2026-07-01',
        visitReason: 'Fever',
        waitTimeMinutes: 25,
        providerId: 'DR1',
        sourceRow: 1,
      },
      normalizations: [],
    })
  })

  it('trims every cell before using it', () => {
    const result = normalizeRow(
      ['  V001 ', ' h-001', ' Bethesda, MD ', ' 2026-07-01 ', ' Fever ', ' 25 ', ' DR1 '],
      INDEXES,
      3,
    )
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.visitId).toBe('V001')
    expect(result.visit.visitReason).toBe('Fever')
    expect(result.visit.waitTimeMinutes).toBe(25)
    expect(result.normalizations).toEqual([])
  })

  it('P3: skips a row whose visit_id is missing', () => {
    expect(normalizeRow(withCell(0, ''), INDEXES, 2)).toEqual({
      kind: 'skipped',
      code: 'missingVisitId',
    })
  })

  it('P3: skips a row whose visit_id is whitespace only', () => {
    expect(normalizeRow(withCell(0, '   '), INDEXES, 2)).toEqual({
      kind: 'skipped',
      code: 'missingVisitId',
    })
  })

  it('P5: skips a row with a blank visit_date as missingVisitDate', () => {
    expect(normalizeRow(withCell(3, ''), INDEXES, 4)).toEqual({
      kind: 'skipped',
      code: 'missingVisitDate',
    })
  })

  it('P5: skips a row with a non-canonical visit_date as invalidVisitDate and keeps the raw value', () => {
    expect(normalizeRow(withCell(3, '07/04/2026'), INDEXES, 5)).toEqual({
      kind: 'skipped',
      code: 'invalidVisitDate',
      value: '07/04/2026',
    })
  })

  it('P5: a missing visit_id is reported before an invalid visit_date (rule order)', () => {
    const cells = withCell(0, '')
    cells[3] = '07/04/2026'
    expect(normalizeRow(cells, INDEXES, 6)).toEqual({
      kind: 'skipped',
      code: 'missingVisitId',
    })
  })

  it('P6: blank location becomes "Unknown"', () => {
    const result = normalizeRow(withCell(2, ''), INDEXES, 7)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.location).toBe('Unknown')
    expect(result.normalizations).toEqual([{ code: 'blankLocation' }])
  })

  it('P7: blank visit_reason becomes "Unspecified"', () => {
    const result = normalizeRow(withCell(4, ''), INDEXES, 8)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.visitReason).toBe('Unspecified')
    expect(result.normalizations).toEqual([{ code: 'blankReason' }])
  })

  it('P8: a blank wait becomes null with missingWait', () => {
    const result = normalizeRow(withCell(5, ''), INDEXES, 9)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.waitTimeMinutes).toBeNull()
    expect(result.normalizations).toEqual([{ code: 'missingWait' }])
  })

  it('P8: a nonnumeric wait becomes null with nonnumericWait and the offending value', () => {
    const result = normalizeRow(withCell(5, 'abc'), INDEXES, 10)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.waitTimeMinutes).toBeNull()
    expect(result.normalizations).toEqual([{ code: 'nonnumericWait', value: 'abc' }])
  })

  it('P8: a negative wait becomes null with negativeWait and the offending value', () => {
    const result = normalizeRow(withCell(5, '-5'), INDEXES, 11)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.waitTimeMinutes).toBeNull()
    expect(result.normalizations).toEqual([{ code: 'negativeWait', value: '-5' }])
  })

  it('P8: zero and decimal waits are valid and are not normalized (D6)', () => {
    const zero = normalizeRow(withCell(5, '0'), INDEXES, 12)
    expect(zero.kind).toBe('accepted')
    if (zero.kind !== 'accepted') return
    expect(zero.visit.waitTimeMinutes).toBe(0)
    expect(zero.normalizations).toEqual([])

    const decimal = normalizeRow(withCell(5, '12.5'), INDEXES, 13)
    expect(decimal.kind).toBe('accepted')
    if (decimal.kind !== 'accepted') return
    expect(decimal.visit.waitTimeMinutes).toBe(12.5)
    expect(decimal.normalizations).toEqual([])
  })

  it('D6: "Infinity" fails the plain-decimal format check and is treated as nonnumeric', () => {
    const result = normalizeRow(withCell(5, 'Infinity'), INDEXES, 14)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.waitTimeMinutes).toBeNull()
    expect(result.normalizations).toEqual([{ code: 'nonnumericWait', value: 'Infinity' }])
  })

  it('D6: hex, exponent, and leading-plus wait strings all fail the plain-decimal format check', () => {
    for (const value of ['0x1A', '1e2', '+5']) {
      const result = normalizeRow(withCell(5, value), INDEXES, 14)
      expect(result.kind).toBe('accepted')
      if (result.kind !== 'accepted') continue
      expect(result.visit.waitTimeMinutes).toBeNull()
      expect(result.normalizations).toEqual([{ code: 'nonnumericWait', value }])
    }
  })

  it('P10: blank patient_id_hashed becomes "Unknown patient"', () => {
    const result = normalizeRow(withCell(1, ''), INDEXES, 15)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.patientIdHashed).toBe('Unknown patient')
    expect(result.normalizations).toEqual([{ code: 'missingPatientId' }])
  })

  it('P10: blank provider_id becomes "Unknown provider"', () => {
    const result = normalizeRow(withCell(6, ''), INDEXES, 16)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.providerId).toBe('Unknown provider')
    expect(result.normalizations).toEqual([{ code: 'missingProviderId' }])
  })

  it('P15: internal whitespace in location and reason collapses to one space and counts as textNormalized', () => {
    const cells = withCell(2, 'bethesda,  md')
    cells[4] = 'Ear   pain'
    const result = normalizeRow(cells, INDEXES, 17)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.location).toBe('bethesda, md')
    expect(result.visit.visitReason).toBe('Ear pain')
    expect(result.normalizations).toEqual([
      { code: 'textNormalized', value: 'bethesda,  md' },
    ])
  })

  it('sourceRow records the data-row number it was given (D20)', () => {
    const result = normalizeRow(VALID, INDEXES, 42)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.sourceRow).toBe(42)
  })

  it('treats missing cells in a short row as blank', () => {
    const result = normalizeRow(['V001', 'h-001', 'Bethesda, MD', '2026-07-01'], INDEXES, 18)
    expect(result.kind).toBe('accepted')
    if (result.kind !== 'accepted') return
    expect(result.visit.visitReason).toBe('Unspecified')
    expect(result.visit.waitTimeMinutes).toBeNull()
    expect(result.visit.providerId).toBe('Unknown provider')
    expect(result.normalizations).toEqual([
      { code: 'blankReason' },
      { code: 'missingWait' },
      { code: 'missingProviderId' },
    ])
  })
})
