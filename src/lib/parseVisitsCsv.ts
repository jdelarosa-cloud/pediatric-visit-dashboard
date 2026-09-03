import { parse } from 'papaparse'
import { resolveHeaders } from './headers.ts'
import {
  UNKNOWN_LOCATION,
  UNSPECIFIED_REASON,
  normalizeRow,
  type RowNormalization,
} from './normalizeRow.ts'
import type {
  ParseCounts,
  ParseOutcome,
  ParseWarning,
  Visit,
  WarningCode,
  WarningExample,
  WarningKind,
} from './types.ts'

export const MAX_WARNING_EXAMPLES = 5

export const EMPTY_FILE_MESSAGE =
  'The file is empty. Choose a CSV with a header row and at least one visit, or load the sample data.'
const NO_DATA_ROWS_MESSAGE = 'The file has a header row but no visit rows.'
const EXCEL_HINT =
  ' If this file came from Excel, save it as CSV (Comma delimited) first, then upload that file.'

const BOM = '﻿'

const WARNING_KINDS: Record<WarningCode, WarningKind> = {
  missingVisitId: 'skipped',
  missingVisitDate: 'skipped',
  invalidVisitDate: 'skipped',
  duplicateVisitId: 'skipped',
  blankLocation: 'normalized',
  blankReason: 'normalized',
  missingWait: 'normalized',
  nonnumericWait: 'normalized',
  negativeWait: 'normalized',
  missingPatientId: 'normalized',
  missingProviderId: 'normalized',
  textNormalized: 'normalized',
  headersNormalized: 'info',
}

const KIND_ORDER: Record<WarningKind, number> = {
  skipped: 0,
  normalized: 1,
  info: 2,
}

function rows(count: number): string {
  return count === 1 ? '1 row' : `${count} rows`
}

function warningMessage(code: WarningCode, count: number): string {
  switch (code) {
    case 'missingVisitId':
      return `${rows(count)} skipped: visit_id is missing.`
    case 'missingVisitDate':
      return `${rows(count)} skipped: visit_date is missing.`
    case 'invalidVisitDate':
      return `${rows(count)} skipped: visit_date is not a valid date in the expected format YYYY-MM-DD.`
    case 'duplicateVisitId':
      return `${rows(count)} skipped: the visit_id repeats an earlier row, and only the first row for an id is kept.`
    case 'blankLocation':
      return `${rows(count)} had a blank location, shown as "${UNKNOWN_LOCATION}".`
    case 'blankReason':
      return `${rows(count)} had a blank visit_reason, shown as "${UNSPECIFIED_REASON}".`
    case 'missingWait':
      return `${rows(count)} had no wait_time_minutes; those visits are excluded from wait averages.`
    case 'nonnumericWait':
      return `${rows(count)} had a wait_time_minutes that is not a number; those visits are excluded from wait averages.`
    case 'negativeWait':
      return `${rows(count)} had a negative wait_time_minutes; those visits are excluded from wait averages.`
    case 'missingPatientId':
      return `${rows(count)} had no patient_id_hashed, shown as "Unknown patient".`
    case 'missingProviderId':
      return `${rows(count)} had no provider_id, shown as "Unknown provider".`
    case 'textNormalized':
      return `${rows(count)} had a location or visit_reason spelling adjusted to match the first spelling seen for it.`
    case 'headersNormalized':
      return `${count === 1 ? '1 column heading' : `${count} column headings`} matched the expected columns only after ignoring capitalization or extra spaces.`
  }
}

type WarningAccumulator = Map<WarningCode, { count: number; examples: WarningExample[] }>

function addWarning(
  accumulator: WarningAccumulator,
  code: WarningCode,
  row: number,
  value?: string,
): void {
  let entry = accumulator.get(code)
  if (!entry) {
    entry = { count: 0, examples: [] }
    accumulator.set(code, entry)
  }
  entry.count += 1
  if (entry.examples.length < MAX_WARNING_EXAMPLES) {
    entry.examples.push(value === undefined ? { row } : { row, value })
  }
}

function toWarnings(accumulator: WarningAccumulator): ParseWarning[] {
  const warnings: ParseWarning[] = []
  for (const [code, entry] of accumulator) {
    warnings.push({
      code,
      kind: WARNING_KINDS[code],
      count: entry.count,
      message: warningMessage(code, entry.count),
      examples: entry.examples,
    })
  }
  warnings.sort((a, b) => {
    const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    if (byKind !== 0) return byKind
    if (a.count !== b.count) return b.count - a.count
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0
  })
  return warnings
}

type AcceptedRow = {
  visit: Visit
  normalizations: RowNormalization[]
}

/**
 * Returns the first spelling seen for `value`, registering it when new.
 * Placeholders are not real spellings, so they never join a group (P15, D8).
 */
function fold(canonical: Map<string, string>, value: string, placeholder: string): string {
  if (value === placeholder) return value
  const key = value.toLowerCase()
  const first = canonical.get(key)
  if (first === undefined) {
    canonical.set(key, value)
    return value
  }
  return first
}

function applyTextGrouping(accepted: AcceptedRow[]): void {
  const canonicalLocation = new Map<string, string>()
  const canonicalReason = new Map<string, string>()

  for (const row of accepted) {
    const location = fold(canonicalLocation, row.visit.location, UNKNOWN_LOCATION)
    const reason = fold(canonicalReason, row.visit.visitReason, UNSPECIFIED_REASON)
    let changed: string | undefined
    if (location !== row.visit.location) changed = row.visit.location
    else if (reason !== row.visit.visitReason) changed = row.visit.visitReason
    row.visit.location = location
    row.visit.visitReason = reason
    if (changed === undefined) continue
    if (row.normalizations.some((entry) => entry.code === 'textNormalized')) continue
    row.normalizations.push({ code: 'textNormalized', value: changed })
  }
}

export function parseVisitsCsv(text: string, fileName = 'upload.csv'): ParseOutcome {
  const source = text.startsWith(BOM) ? text.slice(BOM.length) : text
  if (source.trim() === '') {
    return { ok: false, error: { code: 'EMPTY_FILE', message: EMPTY_FILE_MESSAGE } }
  }

  let table: string[][]
  try {
    table = parse<string[]>(source, { header: false, skipEmptyLines: 'greedy' }).data
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    return {
      ok: false,
      error: { code: 'PARSE_FAILURE', message: `The file could not be read as CSV: ${reason}.` },
    }
  }

  if (table.length === 0) {
    return { ok: false, error: { code: 'EMPTY_FILE', message: EMPTY_FILE_MESSAGE } }
  }

  const headerResolution = resolveHeaders(table[0])
  if (!headerResolution.ok) {
    const { error } = headerResolution
    const isCsvName = fileName.toLowerCase().endsWith('.csv')
    if (error.code === 'MISSING_COLUMNS' && !isCsvName) {
      return { ok: false, error: { ...error, message: error.message + EXCEL_HINT } }
    }
    return { ok: false, error }
  }

  const dataRows = table.slice(1)
  if (dataRows.length === 0) {
    return { ok: false, error: { code: 'NO_DATA_ROWS', message: NO_DATA_ROWS_MESSAGE } }
  }

  const warnings: WarningAccumulator = new Map()
  const accepted: AcceptedRow[] = []
  let skipped = 0

  dataRows.forEach((cells, index) => {
    const row = index + 1
    const result = normalizeRow(cells, headerResolution.indexes, row)
    if (result.kind === 'skipped') {
      skipped += 1
      addWarning(warnings, result.code, row, result.value)
      return
    }
    accepted.push({ visit: result.visit, normalizations: result.normalizations })
  })

  const seenIds = new Set<string>()
  const unique: AcceptedRow[] = []
  for (const row of accepted) {
    if (seenIds.has(row.visit.visitId)) {
      skipped += 1
      addWarning(warnings, 'duplicateVisitId', row.visit.sourceRow, row.visit.visitId)
      continue
    }
    seenIds.add(row.visit.visitId)
    unique.push(row)
  }

  applyTextGrouping(unique)

  let normalized = 0
  for (const row of unique) {
    if (row.normalizations.length === 0) continue
    normalized += 1
    for (const entry of row.normalizations) {
      addWarning(warnings, entry.code, row.visit.sourceRow, entry.value)
    }
  }

  for (const header of headerResolution.normalizedHeaders) {
    // Row 0 stands for the header row; data rows are numbered from 1 (D20).
    addWarning(warnings, 'headersNormalized', 0, `${header.raw} -> ${header.matched}`)
  }

  const counts: ParseCounts = {
    totalRows: dataRows.length,
    accepted: unique.length,
    skipped,
    normalized,
  }

  return {
    ok: true,
    visits: unique.map((row) => row.visit),
    warnings: toWarnings(warnings),
    counts,
  }
}
