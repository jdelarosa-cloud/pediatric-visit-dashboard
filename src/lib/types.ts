export type Visit = {
  visitId: string
  patientIdHashed: string
  location: string
  /**
   * Date-only canonical string, never a Date. Parsing "2026-07-04" as a Date
   * yields UTC midnight, which renders as the previous day west of Greenwich
   * and would silently shift visits across day boundaries (P11).
   */
  visitDate: string
  visitReason: string
  /**
   * Null means "no usable wait was recorded" - missing, nonnumeric, or negative
   * (P8). It must stay distinct from 0, which is a real zero-minute wait:
   * averages and "with wait data" counts exclude nulls rather than counting
   * them as zero, which would drag every average down (P9).
   */
  waitTimeMinutes: number | null
  providerId: string
  sourceRow: number
}
