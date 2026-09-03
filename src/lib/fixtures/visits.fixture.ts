import type { ParseCounts } from '../types.ts'

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
