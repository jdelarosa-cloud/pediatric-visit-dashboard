import { formatVisitDate, maskPatientId } from '../lib/display.ts'
import { UNKNOWN_PROVIDER } from '../lib/normalizeRow.ts'
import type { Visit } from '../lib/types.ts'
import styles from './VisitPreviewTable.module.css'

const PREVIEW_LIMIT = 25

function formatWait(value: number | null): string {
  return value === null ? 'Not recorded' : `${value} min`
}

export function VisitPreviewTable({ visits }: { visits: readonly Visit[] }) {
  const preview = visits.slice(0, PREVIEW_LIMIT)
  const countCopy = `Showing ${preview.length} of ${visits.length} matching ${visits.length === 1 ? 'visit' : 'visits'} · Preview limited to the first ${PREVIEW_LIMIT}`

  return (
    <section aria-labelledby="visit-preview-title" className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Detail</p>
          <h2 id="visit-preview-title">Visit Preview</h2>
        </div>
        <p>{countCopy}</p>
      </div>

      {preview.length === 0 ? (
        <div className={styles.emptyPanel}>
          <h3>No Visits to Preview</h3>
          <p>No accepted visits match the current filters.</p>
        </div>
      ) : (
        <>
          <p className={styles.scrollNote}>Scroll horizontally to see all seven columns.</p>
          <div
            aria-label="Scrollable visit preview table"
            className={styles.tableScroll}
            role="region"
            tabIndex={0}
          >
            <table>
              <caption>{countCopy}</caption>
              <thead>
                <tr>
                  <th scope="col">Visit ID</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Location</th>
                  <th scope="col">Visit Date</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Wait</th>
                  <th scope="col">Provider</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((visit) => {
                  const maskedPatient = maskPatientId(visit.patientIdHashed)
                  const provider =
                    visit.providerId === UNKNOWN_PROVIDER ? 'Not recorded' : visit.providerId
                  return (
                    <tr key={visit.visitId}>
                      <td>{visit.visitId}</td>
                      <td
                        className={
                          maskedPatient === 'Not recorded' ? styles.missing : styles.masked
                        }
                      >
                        {maskedPatient}
                      </td>
                      <td>{visit.location}</td>
                      <td>{formatVisitDate(visit.visitDate)}</td>
                      <td>{visit.visitReason}</td>
                      <td className={visit.waitTimeMinutes === null ? styles.missing : undefined}>
                        {formatWait(visit.waitTimeMinutes)}
                      </td>
                      <td className={provider === 'Not recorded' ? styles.missing : undefined}>
                        {provider}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
