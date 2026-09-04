import { parseVisitDate } from './dates.ts'
import type { ColumnIndexes } from './headers.ts'
import type { Visit, WarningCode } from './types.ts'

export const UNKNOWN_LOCATION = 'Unknown'
export const UNSPECIFIED_REASON = 'Unspecified'
export const UNKNOWN_PATIENT = 'Unknown patient'
export const UNKNOWN_PROVIDER = 'Unknown provider'

export type RowNormalization = {
  code: WarningCode
  value?: string
}

export type RowResult =
  | { kind: 'skipped'; code: WarningCode; value?: string }
  | { kind: 'accepted'; visit: Visit; normalizations: RowNormalization[] }

function cell(cells: string[], index: number): string {
  return (cells[index] ?? '').trim()
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ')
}

// Plain decimal only (D6): hex (0x1A), exponent notation (1e2), Infinity, and
// a leading plus sign are all valid input to Number() but are spreadsheet or
// JS artifacts, not minutes a person entered, so they must not pass silently.
const PLAIN_DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/

export function normalizeRow(
  cells: string[],
  indexes: ColumnIndexes,
  row: number,
): RowResult {
  const visitId = cell(cells, indexes.visit_id)
  if (visitId === '') return { kind: 'skipped', code: 'missingVisitId' }

  const rawDate = cell(cells, indexes.visit_date)
  if (rawDate === '') return { kind: 'skipped', code: 'missingVisitDate' }
  const visitDate = parseVisitDate(rawDate)
  if (visitDate === null) {
    return { kind: 'skipped', code: 'invalidVisitDate', value: rawDate }
  }

  const normalizations: RowNormalization[] = []

  const rawPatient = cell(cells, indexes.patient_id_hashed)
  let patientIdHashed = rawPatient
  if (patientIdHashed === '') {
    patientIdHashed = UNKNOWN_PATIENT
    normalizations.push({ code: 'missingPatientId' })
  }

  const rawLocation = cell(cells, indexes.location)
  let location = collapseWhitespace(rawLocation)
  let collapsedExample: string | undefined
  if (location === '') {
    location = UNKNOWN_LOCATION
    normalizations.push({ code: 'blankLocation' })
  } else if (location !== rawLocation) {
    collapsedExample = rawLocation
  }

  const rawReason = cell(cells, indexes.visit_reason)
  let visitReason = collapseWhitespace(rawReason)
  if (visitReason === '') {
    visitReason = UNSPECIFIED_REASON
    normalizations.push({ code: 'blankReason' })
  } else if (visitReason !== rawReason && collapsedExample === undefined) {
    collapsedExample = rawReason
  }

  const rawWait = cell(cells, indexes.wait_time_minutes)
  let waitTimeMinutes: number | null = null
  if (rawWait === '') {
    normalizations.push({ code: 'missingWait' })
  } else if (!PLAIN_DECIMAL_PATTERN.test(rawWait)) {
    normalizations.push({ code: 'nonnumericWait', value: rawWait })
  } else {
    const parsed = Number(rawWait)
    // A plain-decimal string of 309 or more digits passes the format check but
    // overflows to Infinity, which would poison every average it reaches, so it
    // is nonnumeric rather than a wait (D6, CF-1).
    if (!Number.isFinite(parsed)) {
      normalizations.push({ code: 'nonnumericWait', value: rawWait })
    } else if (parsed < 0) {
      normalizations.push({ code: 'negativeWait', value: rawWait })
    } else {
      waitTimeMinutes = parsed
    }
  }

  const rawProvider = cell(cells, indexes.provider_id)
  let providerId = rawProvider
  if (providerId === '') {
    providerId = UNKNOWN_PROVIDER
    normalizations.push({ code: 'missingProviderId' })
  }

  if (collapsedExample !== undefined) {
    normalizations.push({ code: 'textNormalized', value: collapsedExample })
  }

  return {
    kind: 'accepted',
    visit: {
      visitId,
      patientIdHashed,
      location,
      visitDate,
      visitReason,
      waitTimeMinutes,
      providerId,
      sourceRow: row,
    },
    normalizations,
  }
}
