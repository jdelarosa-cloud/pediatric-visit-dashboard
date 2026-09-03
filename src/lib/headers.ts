import type { ParseError } from './types.ts'

export const REQUIRED_COLUMNS = [
  'visit_id',
  'patient_id_hashed',
  'location',
  'visit_date',
  'visit_reason',
  'wait_time_minutes',
  'provider_id',
] as const

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number]

export type ColumnIndexes = Record<RequiredColumn, number>

export type NormalizedHeader = {
  raw: string
  matched: RequiredColumn
}

export type HeaderResolution =
  | { ok: true; indexes: ColumnIndexes; normalizedHeaders: NormalizedHeader[] }
  | { ok: false; error: ParseError }

const BOM = '﻿'

function stripBom(header: string, isFirst: boolean): string {
  return isFirst && header.startsWith(BOM) ? header.slice(BOM.length) : header
}

export function resolveHeaders(rawHeaders: string[]): HeaderResolution {
  const deBommed = rawHeaders.map((header, index) => stripBom(header ?? '', index === 0))
  const cleaned = deBommed.map((header) => header.trim())
  const foundColumns = cleaned.filter((header) => header !== '')

  const matches = new Map<RequiredColumn, number[]>()
  const normalizedHeaders: NormalizedHeader[] = []

  cleaned.forEach((header, index) => {
    const lower = header.toLowerCase()
    const matched = REQUIRED_COLUMNS.find((column) => column === lower)
    if (!matched) return
    const existing = matches.get(matched)
    if (existing) existing.push(index)
    else matches.set(matched, [index])
    // Compared BOM-stripped: a lone U+FEFF is invisible, so reporting it would
    // put an unrenderable character in the warning shown to the user.
    if (deBommed[index] !== matched) {
      normalizedHeaders.push({ raw: deBommed[index], matched })
    }
  })

  // E5 outranks E3: if a column is ambiguous, silently picking one of the
  // candidates could pair the wrong data with the right column name.
  const ambiguous = REQUIRED_COLUMNS.filter(
    (column) => (matches.get(column)?.length ?? 0) > 1,
  )
  if (ambiguous.length > 0) {
    const details = ambiguous
      .map((column) => {
        const conflicting = (matches.get(column) ?? [])
          .map((index) => `"${cleaned[index]}"`)
          .join(', ')
        return `"${column}" is matched by ${conflicting}`
      })
      .join('; ')
    return {
      ok: false,
      error: {
        code: 'AMBIGUOUS_COLUMNS',
        message: `The file has more than one column for the same field: ${details}. Rename or remove the extra columns so each required column appears once, then upload again.`,
      },
    }
  }

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !matches.has(column))
  if (missingColumns.length > 0) {
    const found = foundColumns.length > 0 ? foundColumns.join(', ') : 'none'
    return {
      ok: false,
      error: {
        code: 'MISSING_COLUMNS',
        message: `The file is missing required columns: ${missingColumns.join(', ')}. Columns found: ${found}.`,
        missingColumns: [...missingColumns],
        foundColumns,
      },
    }
  }

  const indexes = Object.fromEntries(
    REQUIRED_COLUMNS.map((column) => [column, (matches.get(column) as number[])[0]]),
  ) as ColumnIndexes

  return { ok: true, indexes, normalizedHeaders }
}
