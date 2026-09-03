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
  } else {
    const parsed = Number(rawWait)
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
