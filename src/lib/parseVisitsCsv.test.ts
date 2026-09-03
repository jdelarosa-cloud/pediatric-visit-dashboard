import { describe, expect, it } from 'vitest'
import {
  FIXTURE_ACCEPTED_IDS,
  FIXTURE_COUNTS,
  FIXTURE_CSV,
  FIXTURE_HEADER,
  FIXTURE_PATIENT_HASHES,
} from './fixtures/visits.fixture.ts'
import { MAX_WARNING_EXAMPLES, parseVisitsCsv } from './parseVisitsCsv.ts'
import type { ParseWarning } from './types.ts'

function warningsByCode(warnings: ParseWarning[]): Record<string, ParseWarning> {
  return Object.fromEntries(warnings.map((warning) => [warning.code, warning]))
}

describe('parseVisitsCsv rejections', () => {
  it('E1: an empty string is rejected as EMPTY_FILE with the actionable message', () => {
    const outcome = parseVisitsCsv('')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('EMPTY_FILE')
    expect(outcome.error.message).toBe(
      'The file is empty. Choose a CSV with a header row and at least one visit, or load the sample data.',
    )
  })

  it('E1: a whitespace-only file is rejected as EMPTY_FILE', () => {
    const outcome = parseVisitsCsv('   \n\r\n  \t ')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('EMPTY_FILE')
  })

  it('E1: a file containing only a BOM is rejected as EMPTY_FILE', () => {
    const outcome = parseVisitsCsv('﻿')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('EMPTY_FILE')
  })

  it('E2: a header row with no data rows is rejected as NO_DATA_ROWS', () => {
    const outcome = parseVisitsCsv(`${FIXTURE_HEADER}\n`)
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('NO_DATA_ROWS')
    expect(outcome.error.message).toBe('The file has a header row but no visit rows.')
  })

  it('E2: a header row followed only by blank lines is rejected as NO_DATA_ROWS', () => {
    const outcome = parseVisitsCsv(`${FIXTURE_HEADER}\n\n   \n`)
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('NO_DATA_ROWS')
  })

  it('E3: a missing required column lists the missing and the found columns', () => {
    const outcome = parseVisitsCsv(
      'visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes\nV001,h-001,Bethesda,2026-07-01,Fever,25\n',
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('MISSING_COLUMNS')
    expect(outcome.error.missingColumns).toEqual(['provider_id'])
    expect(outcome.error.foundColumns).toEqual([
      'visit_id',
      'patient_id_hashed',
      'location',
      'visit_date',
      'visit_reason',
      'wait_time_minutes',
    ])
    expect(outcome.error.message).toContain('provider_id')
    expect(outcome.error.message).toContain('wait_time_minutes')
  })

  it('D5: the Excel hint is added when the file name is not a .csv', () => {
    const text =
      'visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes\nV001,h-001,Bethesda,2026-07-01,Fever,25\n'
    const outcome = parseVisitsCsv(text, 'data.xlsx')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.message).toContain('Excel')
  })

  it('D5: the Excel hint is absent for a .csv file name, whatever its case', () => {
    const text =
      'visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes\nV001,h-001,Bethesda,2026-07-01,Fever,25\n'
    expect(parseVisitsCsv(text, 'data.csv').ok).toBe(false)
    const lower = parseVisitsCsv(text, 'data.csv')
    const upper = parseVisitsCsv(text, 'DATA.CSV')
    if (lower.ok || upper.ok) return
    expect(lower.error.message).not.toContain('Excel')
    expect(upper.error.message).not.toContain('Excel')
  })

  it('E5: duplicate headers for one required column are rejected as AMBIGUOUS_COLUMNS', () => {
    const outcome = parseVisitsCsv(`${FIXTURE_HEADER},Location\nV001,h-001,A,2026-07-01,Fever,25,DR1,B\n`)
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error.code).toBe('AMBIGUOUS_COLUMNS')
    expect(outcome.error.message).toContain('Location')
  })

  it('P1: an empty file and a file missing a required column are both rejected whole', () => {
    expect(parseVisitsCsv('').ok).toBe(false)
    expect(parseVisitsCsv('visit_id\nV001\n').ok).toBe(false)
  })
})

describe('parseVisitsCsv parsing', () => {
  it('handles quoted fields containing commas', () => {
    const outcome = parseVisitsCsv(`${FIXTURE_HEADER}\nV001,h-001,"Bethesda, MD",2026-07-01,Fever,25,DR1\n`)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.visits[0].location).toBe('Bethesda, MD')
  })

  it('handles CRLF line endings', () => {
    const text = `${FIXTURE_HEADER}\r\nV001,h-001,"Bethesda, MD",2026-07-01,Fever,25,DR1\r\nV002,h-002,"Hoboken, NJ",2026-07-02,Cough,10,DR2\r\n`
    const outcome = parseVisitsCsv(text)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.counts).toEqual({ totalRows: 2, accepted: 2, skipped: 0, normalized: 0 })
    expect(outcome.visits.map((visit) => visit.visitId)).toEqual(['V001', 'V002'])
  })

  it('ignores blank lines when numbering data rows (D20)', () => {
    const text = `${FIXTURE_HEADER}\n\nV001,h-001,Bethesda,2026-07-01,Fever,25,DR1\n\n   \nV002,h-002,Hoboken,2026-07-02,Cough,10,DR2\n`
    const outcome = parseVisitsCsv(text)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.counts.totalRows).toBe(2)
    expect(outcome.visits.map((visit) => visit.sourceRow)).toEqual([1, 2])
  })

  it('P2: ignores extra columns and reports headers that matched only after case folding', () => {
    const text =
      'Visit_ID,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes,provider_id,notes\nV001,h-001,Bethesda,2026-07-01,Fever,25,DR1,ignored\n'
    const outcome = parseVisitsCsv(text)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.visits[0].visitId).toBe('V001')
    const info = outcome.warnings.filter((warning) => warning.kind === 'info')
    expect(info).toHaveLength(1)
    expect(info[0].code).toBe('headersNormalized')
    expect(info[0].count).toBe(1)
    expect(info[0].examples[0].value).toBe('Visit_ID -> visit_id')
  })

  it('P4: the first row for a visit_id is kept and later duplicates are skipped', () => {
    const outcome = parseVisitsCsv(FIXTURE_CSV)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const kept = outcome.visits.find((visit) => visit.visitId === 'V001')
    expect(kept?.sourceRow).toBe(1)
    expect(kept?.visitDate).toBe('2026-07-01')
    const duplicate = warningsByCode(outcome.warnings).duplicateVisitId
    expect(duplicate.count).toBe(1)
    expect(duplicate.examples).toEqual([{ row: 6, value: 'V001' }])
  })

  it('P15: a later spelling folds into the first-seen spelling of a location', () => {
    const outcome = parseVisitsCsv(FIXTURE_CSV)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const folded = outcome.visits.find((visit) => visit.visitId === 'V007')
    expect(folded?.location).toBe('Bethesda, MD')
    const textNormalized = warningsByCode(outcome.warnings).textNormalized
    expect(textNormalized.count).toBe(1)
    expect(textNormalized.examples[0].row).toBe(7)
  })

  it('P15: reasons group case-insensitively on the first-seen spelling', () => {
    const text = `${FIXTURE_HEADER}\nV001,h-001,Bethesda,2026-07-01,Fever,25,DR1\nV002,h-002,Bethesda,2026-07-02,fever,10,DR2\n`
    const outcome = parseVisitsCsv(text)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.visits.map((visit) => visit.visitReason)).toEqual(['Fever', 'Fever'])
    expect(warningsByCode(outcome.warnings).textNormalized.count).toBe(1)
  })

  it('P15: placeholder values are exempt from textNormalized warnings', () => {
    const text = `${FIXTURE_HEADER}\nV001,h-001,,2026-07-01,,25,DR1\nV002,h-002,,2026-07-02,,10,DR2\n`
    const outcome = parseVisitsCsv(text)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.visits.map((visit) => visit.location)).toEqual(['Unknown', 'Unknown'])
    expect(warningsByCode(outcome.warnings).textNormalized).toBeUndefined()
  })
})

describe('parseVisitsCsv fixture outcome', () => {
  const outcome = parseVisitsCsv(FIXTURE_CSV)

  it('produces the expected counts', () => {
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.counts).toEqual(FIXTURE_COUNTS)
  })

  it('keeps the accepted visits in file order', () => {
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.visits.map((visit) => visit.visitId)).toEqual(FIXTURE_ACCEPTED_IDS)
    expect(outcome.visits.map((visit) => visit.sourceRow)).toEqual([1, 2, 4, 7, 8])
  })

  it('applies every row policy to the fixture', () => {
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const byId = Object.fromEntries(outcome.visits.map((visit) => [visit.visitId, visit]))
    expect(byId.V002.waitTimeMinutes).toBeNull()
    expect(byId.V004.location).toBe('Unknown')
    expect(byId.V007.patientIdHashed).toBe('Unknown patient')
    expect(byId.V007.visitReason).toBe('Unspecified')
    expect(byId.V007.waitTimeMinutes).toBeNull()
    expect(byId.V007.providerId).toBe('Unknown provider')
    expect(byId.V008.waitTimeMinutes).toBeNull()
  })

  it('emits one warning per code with the expected count and example rows', () => {
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const byCode = warningsByCode(outcome.warnings)
    const expected: Record<string, { kind: string; row: number; value?: string }> = {
      missingVisitId: { kind: 'skipped', row: 3 },
      invalidVisitDate: { kind: 'skipped', row: 5, value: '07/04/2026' },
      duplicateVisitId: { kind: 'skipped', row: 6, value: 'V001' },
      blankLocation: { kind: 'normalized', row: 4 },
      blankReason: { kind: 'normalized', row: 7 },
      missingWait: { kind: 'normalized', row: 2 },
      nonnumericWait: { kind: 'normalized', row: 8, value: 'abc' },
      negativeWait: { kind: 'normalized', row: 7, value: '-5' },
      missingPatientId: { kind: 'normalized', row: 7 },
      missingProviderId: { kind: 'normalized', row: 7 },
      textNormalized: { kind: 'normalized', row: 7 },
    }
    expect(Object.keys(byCode).sort()).toEqual(Object.keys(expected).sort())
    for (const [code, { kind, row, value }] of Object.entries(expected)) {
      expect(byCode[code].kind).toBe(kind)
      expect(byCode[code].count).toBe(1)
      expect(byCode[code].examples[0].row).toBe(row)
      if (value !== undefined) expect(byCode[code].examples[0].value).toBe(value)
      expect(byCode[code].message).toContain('1')
      if (kind === 'skipped') expect(byCode[code].message).toContain('skipped')
    }
    expect(byCode.invalidVisitDate.message).toContain('YYYY-MM-DD')
  })

  it('AC-12: no warning example exposes a patient hash', () => {
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const values = outcome.warnings.flatMap((warning) =>
      warning.examples.map((example) => example.value ?? ''),
    )
    const joined = values.join(' | ')
    for (const hash of FIXTURE_PATIENT_HASHES) {
      expect(joined).not.toContain(hash)
    }
  })
})

describe('parseVisitsCsv warning aggregation', () => {
  it('caps examples at MAX_WARNING_EXAMPLES while keeping the full count', () => {
    expect(MAX_WARNING_EXAMPLES).toBe(5)
    const rows = Array.from(
      { length: 8 },
      (_unused, index) => `V${100 + index},h-${100 + index},Bethesda,07/0${index + 1}/2026,Fever,10,DR1`,
    )
    const outcome = parseVisitsCsv(`${FIXTURE_HEADER}\n${rows.join('\n')}\n`)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const invalid = warningsByCode(outcome.warnings).invalidVisitDate
    expect(invalid.count).toBe(8)
    expect(invalid.examples).toHaveLength(MAX_WARNING_EXAMPLES)
    expect(invalid.examples.map((example) => example.row)).toEqual([1, 2, 3, 4, 5])
    expect(invalid.message).toContain('8')
    expect(invalid.message).toContain('skipped')
  })

  it('orders warnings skipped first, then normalized, then info, by count descending then code', () => {
    const text = [
      'Visit_ID,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes,provider_id',
      'V001,h-001,Bethesda,2026-07-01,Fever,,DR1',
      'V002,h-002,,2026-07-02,Fever,,DR1',
      'V003,h-003,Bethesda,2026-07-03,Fever,,DR1',
      ',h-004,Bethesda,2026-07-04,Fever,10,DR1',
      'V005,h-005,Bethesda,2026-13-04,Fever,10,DR1',
    ].join('\n')
    const outcome = parseVisitsCsv(`${text}\n`)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.warnings.map((warning) => warning.code)).toEqual([
      'invalidVisitDate',
      'missingVisitId',
      'missingWait',
      'blankLocation',
      'headersNormalized',
    ])
    expect(outcome.warnings.map((warning) => warning.kind)).toEqual([
      'skipped',
      'skipped',
      'normalized',
      'normalized',
      'info',
    ])
  })

  it('D4: a file whose every row is skipped still parses as ok with zero visits', () => {
    const text = `${FIXTURE_HEADER}\n,h-001,Bethesda,2026-07-01,Fever,25,DR1\n,h-002,Bethesda,2026-07-02,Fever,25,DR1\n`
    const outcome = parseVisitsCsv(text)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.visits).toEqual([])
    expect(outcome.counts).toEqual({ totalRows: 2, accepted: 0, skipped: 2, normalized: 0 })
  })
})
