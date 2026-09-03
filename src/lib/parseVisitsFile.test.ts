import { describe, expect, it } from 'vitest'
import { FIXTURE_COUNTS, FIXTURE_CSV } from './fixtures/visits.fixture.ts'
import { parseVisitsFile } from './parseVisitsFile.ts'

describe('parseVisitsFile', () => {
  it('E1: a zero-byte file is rejected as EMPTY_FILE without reading it', async () => {
    const outcome = await parseVisitsFile(new File([], 'empty.csv', { type: 'text/csv' }))
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('EMPTY_FILE')
  })

  it('parses a File containing the fixture CSV into the expected counts', async () => {
    const outcome = await parseVisitsFile(new File([FIXTURE_CSV], 'visits.csv', { type: 'text/csv' }))
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.counts).toEqual(FIXTURE_COUNTS)
  })

  it('D5: passes the file name through so a non-csv extension gets the Excel hint', async () => {
    const text =
      'visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes\nV001,h-001,Bethesda,2026-07-01,Fever,25\n'
    const outcome = await parseVisitsFile(new File([text], 'data.xlsx'))
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('MISSING_COLUMNS')
    expect(outcome.error.message).toContain('Excel')
  })

  it('E4: a file whose text cannot be read is rejected as PARSE_FAILURE', async () => {
    const unreadable = {
      name: 'broken.csv',
      size: 10,
      text: () => Promise.reject(new Error('read error')),
    } as unknown as File
    const outcome = await parseVisitsFile(unreadable)
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('PARSE_FAILURE')
    expect(outcome.error.message).toBe('The file could not be read as CSV: read error.')
  })
})
