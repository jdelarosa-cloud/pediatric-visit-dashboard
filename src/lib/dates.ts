const CANONICAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Calendar validity is pure arithmetic on purpose: `new Date('2026-02-30')`
 * rolls over to March 2 instead of failing, and any local-time Date would shift
 * the day west of Greenwich (P11).
 */
export function parseVisitDate(raw: string): string | null {
  const trimmed = (raw ?? '').trim()
  const match = CANONICAL_DATE.exec(trimmed)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return null

  const maxDay = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1]
  if (day < 1 || day > maxDay) return null

  return trimmed
}

export function isCanonicalDate(raw: string): boolean {
  return parseVisitDate(raw) !== null
}
