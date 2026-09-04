import type { ParseCounts, ParseWarning } from '../lib/types.ts'
import styles from './DataQualitySummary.module.css'

type DataQualitySummaryProps = {
  counts: ParseCounts
  warnings: ParseWarning[]
  compact?: boolean
}

const KIND_LABELS = {
  skipped: 'Skipped',
  normalized: 'Adjusted',
  info: 'Information',
}

function qualitySummary(counts: ParseCounts, warnings: ParseWarning[]): string {
  if (counts.accepted === 0) {
    const leadingWarning = warnings.find((warning) => warning.kind === 'skipped')
    return `0 of ${counts.totalRows} rows could be used.${leadingWarning ? ` ${leadingWarning.message}` : ''}`
  }
  if (warnings.length === 0) return 'All rows are ready. No rows were skipped or adjusted.'
  if (counts.skipped === 0) {
    return 'All visits were accepted. Adjusted values remain included in the dashboard.'
  }
  return 'Most rows are ready. Adjusted rows remain included; skipped rows are excluded from the dashboard.'
}

export function DataQualitySummary({ counts, warnings, compact = false }: DataQualitySummaryProps) {
  const hasWarning = counts.skipped > 0 || counts.normalized > 0
  const isEmpty = counts.accepted === 0

  return (
    <section
      aria-labelledby="data-quality-heading"
      className={`${styles.card} ${hasWarning ? styles.warning : styles.clean} ${isEmpty ? styles.empty : ''} ${compact ? styles.compact : ''}`}
    >
      <div className={styles.topline}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Data quality</p>
          <h2 id="data-quality-heading">{counts.totalRows} Rows Read</h2>
          <p>{qualitySummary(counts, warnings)}</p>
        </div>
        <dl className={styles.metrics}>
          <div className={styles.metric}>
            <dt>Accepted</dt>
            <dd className={styles.accepted}>{counts.accepted}</dd>
          </div>
          <div className={styles.metric}>
            <dt>Normalized</dt>
            <dd className={styles.normalized}>{counts.normalized}</dd>
          </div>
          <div className={styles.metric}>
            <dt>Skipped</dt>
            <dd className={styles.skipped}>{counts.skipped}</dd>
          </div>
        </dl>
      </div>

      {warnings.length > 0 && (
        <details className={styles.details}>
          <summary>Review Data-Quality Details</summary>
          <ul
            aria-label={compact ? 'Scrollable data-quality details' : undefined}
            className={styles.warningList}
            tabIndex={compact ? 0 : undefined}
          >
            {warnings.map((warning) => (
              <li key={warning.code}>
                <div className={styles.warningHeading}>
                  <span className={`${styles.kind} ${styles[warning.kind]}`}>
                    {KIND_LABELS[warning.kind]}
                  </span>
                  <strong>{warning.message}</strong>
                </div>
                {warning.examples.length > 0 && (
                  <p className={styles.examples}>
                    {warning.examples
                      .map((example) =>
                        example.row === 0
                          ? example.value
                          : `row ${example.row}${example.value ? ` (${example.value})` : ''}`,
                      )
                      .filter((example) => example !== undefined)
                      .join(' · ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
