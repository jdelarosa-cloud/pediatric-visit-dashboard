import { describe, expect, it } from 'vitest'
import { formatVisitDate, maskPatientId } from './display.ts'

describe('formatVisitDate', () => {
  it('formats a canonical date without constructing a timezone-sensitive Date', () => {
    expect(formatVisitDate('2026-07-06')).toBe('Jul 6, 2026')
    expect(formatVisitDate('2024-02-29')).toBe('Feb 29, 2024')
  })

  it('returns an unexpected value unchanged instead of inventing a date', () => {
    expect(formatVisitDate('not-a-date')).toBe('not-a-date')
  })
})

describe('maskPatientId', () => {
  it('shows only the final three characters of a patient hash', () => {
    expect(maskPatientId('patient-hash-100')).toBe('•••100')
  })

  it('uses a clear missing label and does not expose short identifiers', () => {
    expect(maskPatientId('Unknown patient')).toBe('Not recorded')
    expect(maskPatientId('AB')).toBe('•••')
  })
})
