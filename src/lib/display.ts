import { UNKNOWN_PATIENT } from './normalizeRow.ts'

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const CANONICAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatVisitDate(value: string): string {
  const match = CANONICAL_DATE.exec(value)
  if (match === null) return value

  const month = SHORT_MONTHS[Number(match[2]) - 1]
  if (month === undefined) return value
  return `${month} ${Number(match[3])}, ${match[1]}`
}

export function maskPatientId(value: string): string {
  if (value === UNKNOWN_PATIENT) return 'Not recorded'
  if (value.length <= 3) return '•••'
  return `•••${value.slice(-3)}`
}
