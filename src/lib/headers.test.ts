import { describe, expect, it } from 'vitest'
import { REQUIRED_COLUMNS, resolveHeaders } from './headers.ts'

const CLEAN = [
  'visit_id',
  'patient_id_hashed',
  'location',
  'visit_date',
  'visit_reason',
  'wait_time_minutes',
  'provider_id',
]

describe('resolveHeaders', () => {
  it('REQUIRED_COLUMNS lists the seven schema columns in schema order', () => {
    expect(REQUIRED_COLUMNS).toEqual(CLEAN)
  })

  it('P2: resolves a clean header row to column indexes with no normalizations', () => {
    const result = resolveHeaders(CLEAN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.indexes).toEqual({
      visit_id: 0,
      patient_id_hashed: 1,
      location: 2,
      visit_date: 3,
      visit_reason: 4,
      wait_time_minutes: 5,
      provider_id: 6,
    })
    expect(result.normalizedHeaders).toEqual([])
  })

  it('P2: strips a UTF-8 BOM from the first header without reporting it as normalized', () => {
    const result = resolveHeaders(['﻿visit_id', ...CLEAN.slice(1)])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.indexes.visit_id).toBe(0)
    expect(result.normalizedHeaders).toEqual([])
  })

  it('P2: a header with a BOM and a case difference is reported without the BOM', () => {
    const result = resolveHeaders(['﻿Visit_ID', ...CLEAN.slice(1)])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.indexes.visit_id).toBe(0)
    expect(result.normalizedHeaders).toEqual([{ raw: 'Visit_ID', matched: 'visit_id' }])
  })

  it('P2: trims surrounding whitespace and reports the header as normalized', () => {
    const result = resolveHeaders(['  visit_id  ', ...CLEAN.slice(1)])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.indexes.visit_id).toBe(0)
    expect(result.normalizedHeaders).toEqual([
      { raw: '  visit_id  ', matched: 'visit_id' },
    ])
  })

  it('P2: matches header names case-insensitively and reports them as normalized', () => {
    const result = resolveHeaders(['Visit_ID', 'Patient_Id_Hashed', ...CLEAN.slice(2)])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.indexes.visit_id).toBe(0)
    expect(result.indexes.patient_id_hashed).toBe(1)
    expect(result.normalizedHeaders).toEqual([
      { raw: 'Visit_ID', matched: 'visit_id' },
      { raw: 'Patient_Id_Hashed', matched: 'patient_id_hashed' },
    ])
  })

  it('P2: accepts any column order', () => {
    const reversed = [...CLEAN].reverse()
    const result = resolveHeaders(reversed)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.indexes.provider_id).toBe(0)
    expect(result.indexes.visit_id).toBe(6)
  })

  it('P2: ignores extra columns', () => {
    const result = resolveHeaders(['notes', ...CLEAN, 'internal_flag'])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.indexes.visit_id).toBe(1)
    expect(result.indexes.provider_id).toBe(7)
    expect(result.normalizedHeaders).toEqual([])
  })

  it('E3: missing columns produce MISSING_COLUMNS listing the missing and the found columns', () => {
    const result = resolveHeaders(['visit_id', 'location', '  ', 'visit_date', 'notes'])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('MISSING_COLUMNS')
    expect(result.error.missingColumns).toEqual([
      'patient_id_hashed',
      'visit_reason',
      'wait_time_minutes',
      'provider_id',
    ])
    expect(result.error.foundColumns).toEqual([
      'visit_id',
      'location',
      'visit_date',
      'notes',
    ])
    expect(result.error.message).toContain('patient_id_hashed')
    expect(result.error.message).toContain('notes')
  })

  it('E3: reports every required column as missing when the header row is blank', () => {
    const result = resolveHeaders([''])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.missingColumns).toEqual(CLEAN)
    expect(result.error.foundColumns).toEqual([])
  })

  it('E5: two headers mapping to the same required column produce AMBIGUOUS_COLUMNS', () => {
    const result = resolveHeaders([...CLEAN, 'Location'])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('AMBIGUOUS_COLUMNS')
    expect(result.error.message).toContain('location')
    expect(result.error.message).toContain('Location')
  })

  it('E5: ambiguity is reported even when another required column is also missing', () => {
    const result = resolveHeaders(['visit_id', 'Visit_Id'])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('AMBIGUOUS_COLUMNS')
  })
})
