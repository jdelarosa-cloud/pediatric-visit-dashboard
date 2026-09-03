import { UNKNOWN_LOCATION } from '../normalizeRow.ts'
import type { ParseCounts, Visit } from '../types.ts'

export const FIXTURE_CSV = `visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes,provider_id
V001,h-001,"Bethesda, MD",2026-07-01,Fever,25,DR1
V002,h-002,"Hoboken, NJ",2026-07-02,Cough,,DR2
,h-003,"Hoboken, NJ",2026-07-02,Fever,10,DR2
V004,h-004,,2026-07-03,Rash,15,DR1
V005,h-005,"Bethesda, MD",07/04/2026,Fever,20,DR3
V001,h-006,"Bethesda, MD",2026-07-05,Ear pain,30,DR1
V007,,"bethesda,  md",2026-07-06,,-5,
V008,h-008,"Hoboken, NJ",2026-07-07,Fever,abc,DR2
`

export const FIXTURE_COUNTS: ParseCounts = {
  totalRows: 8,
  accepted: 5,
  skipped: 3,
  normalized: 4,
}

export const FIXTURE_ACCEPTED_IDS = ['V001', 'V002', 'V004', 'V007', 'V008']

/** Every hash in the fixture, so tests can assert none of them leak into warnings (AC-12). */
export const FIXTURE_PATIENT_HASHES = [
  'h-001',
  'h-002',
  'h-003',
  'h-004',
  'h-005',
  'h-006',
  'h-008',
]

export const FIXTURE_HEADER =
  'visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes,provider_id'

const fixtureVisits: Visit[] = [
  {
    visitId: 'K001',
    patientIdHashed: 'k-001',
    location: 'Bethesda, MD',
    visitDate: '2026-07-01',
    visitReason: 'Fever',
    waitTimeMinutes: 25,
    providerId: 'DR1',
    sourceRow: 1,
  },
  {
    visitId: 'K002',
    patientIdHashed: 'k-002',
    location: 'Bethesda, MD',
    visitDate: '2026-07-02',
    visitReason: 'Cough',
    waitTimeMinutes: 15,
    providerId: 'DR2',
    sourceRow: 2,
  },
  {
    visitId: 'K003',
    patientIdHashed: 'k-003',
    location: 'Bethesda, MD',
    visitDate: '2026-07-03',
    // Untrimmed and lower-case on purpose: KPI grouping must fold it into
    // "Fever" without relying on the parser having cleaned it first (P13).
    visitReason: ' fever ',
    waitTimeMinutes: null,
    providerId: 'DR1',
    sourceRow: 3,
  },
  {
    visitId: 'K004',
    patientIdHashed: 'k-004',
    location: 'Hoboken, NJ',
    visitDate: '2026-07-02',
    visitReason: 'Rash',
    waitTimeMinutes: 10,
    providerId: 'DR2',
    sourceRow: 4,
  },
  {
    visitId: 'K005',
    patientIdHashed: 'k-005',
    location: 'Hoboken, NJ',
    visitDate: '2026-07-04',
    visitReason: 'Fever',
    waitTimeMinutes: 35,
    providerId: 'DR1',
    sourceRow: 5,
  },
  {
    visitId: 'K006',
    patientIdHashed: 'k-006',
    location: 'Hoboken, NJ',
    visitDate: '2026-07-05',
    visitReason: 'Cough',
    waitTimeMinutes: 0,
    providerId: 'DR2',
    sourceRow: 6,
  },
  {
    visitId: 'K007',
    patientIdHashed: 'k-007',
    location: UNKNOWN_LOCATION,
    visitDate: '2026-07-06',
    visitReason: 'Ear pain',
    waitTimeMinutes: null,
    providerId: 'DR1',
    sourceRow: 7,
  },
  {
    visitId: 'K008',
    patientIdHashed: 'k-008',
    location: UNKNOWN_LOCATION,
    visitDate: '2026-07-07',
    visitReason: 'Rash',
    waitTimeMinutes: null,
    providerId: 'DR2',
    sourceRow: 8,
  },
]

/**
 * Deep-frozen so a filter or KPI function that mutates its input throws here
 * (module code is strict mode) instead of quietly corrupting the other tests.
 */
export const FIXTURE_VISITS: readonly Visit[] = Object.freeze(
  fixtureVisits.map((visit) => Object.freeze(visit)),
)
