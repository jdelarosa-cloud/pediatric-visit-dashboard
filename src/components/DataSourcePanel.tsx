import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useDelayedPending } from '../hooks/useDelayedPending.ts'
import type { LoadedVisits } from '../hooks/useVisitsLoader.ts'
import styles from './DataSourcePanel.module.css'

export const VISIT_FILE_INPUT_ID = 'visit-csv-file'

type DataSourcePanelProps = {
  data: LoadedVisits | null
  isLoading: boolean
  loadingFileName: string | null
  onFile: (file: File) => void
  onLoadSample: () => void
}

const REQUIRED_COLUMNS = [
  'visit_id',
  'patient_id_hashed',
  'location',
  'visit_date',
  'visit_reason',
  'wait_time_minutes',
  'provider_id',
]

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type.toLowerCase() === 'text/csv'
}

export function DataSourcePanel({
  data,
  isLoading,
  loadingFileName,
  onFile,
  onLoadSample,
}: DataSourcePanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileHint, setFileHint] = useState<string | null>(null)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showProcessing = useDelayedPending(isLoading)

  useEffect(() => {
    function closeOnOutsidePress(event: PointerEvent) {
      const details = detailsRef.current
      if (details?.open && !details.contains(event.target as Node)) details.open = false
    }

    function closeOnEscape(event: KeyboardEvent) {
      const details = detailsRef.current
      if (event.key !== 'Escape' || !details?.open) return
      details.open = false
      details.querySelector('summary')?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function chooseFile(file: File) {
    if (isLoading) return
    if (!isCsvFile(file)) {
      setFileHint('Choose a CSV file. If this is an Excel workbook, save it as CSV first.')
      return
    }
    setFileHint(null)
    if (detailsRef.current) detailsRef.current.open = false
    onFile(file)
  }

  function loadSample() {
    if (isLoading) return
    setFileHint(null)
    if (detailsRef.current) detailsRef.current.open = false
    onLoadSample()
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) chooseFile(file)
  }

  const dropHandlers = {
    onDragEnter: (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      setIsDragging(true)
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setIsDragging(true)
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      const relatedTarget = event.relatedTarget
      if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
      setIsDragging(false)
    },
    onDrop: handleDrop,
  }

  const fileInput = (
    <input
      accept=".csv,text/csv"
      disabled={isLoading}
      hidden
      id={VISIT_FILE_INPUT_ID}
      onChange={(event) => {
        const file = event.currentTarget.files?.[0]
        if (file) chooseFile(file)
        event.currentTarget.value = ''
      }}
      ref={fileInputRef}
      type="file"
    />
  )

  if (data !== null) {
    const { accepted, totalRows } = data.outcome.counts
    return (
      <div className={styles.compactWrap}>
        <details className={styles.menu} ref={detailsRef}>
          <summary aria-label={`Current file ${data.fileName}. Open data-source options.`}>
            <span
              aria-hidden="true"
              className={`${styles.statusDot} ${accepted === 0 ? styles.statusWarning : ''}`}
            />
            <span className={styles.fileName}>{data.fileName}</span>
            <span className={styles.fileMeta}>
              {accepted}/{totalRows} ready
            </span>
            <svg aria-hidden="true" className={styles.chevron} fill="none" viewBox="0 0 24 24">
              <path
                d="m7 9.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </summary>
          <div className={styles.popover}>
            <h3>Change Data Source</h3>
            <p className={styles.popoverCopy}>Replace the current CSV without leaving the page.</p>
            <div
              {...dropHandlers}
              className={`${styles.compactDropzone} ${isDragging ? styles.dragging : ''}`}
            >
              <div>
                <strong>{isDragging ? 'Drop the CSV to begin' : 'Drop a CSV here'}</strong>
                <span>Processed locally in this browser</span>
              </div>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Browse Files
              </button>
              {fileInput}
            </div>
            {fileHint !== null && (
              <p className={styles.fileHint} role="alert">
                {fileHint}
              </p>
            )}
            <div className={styles.popoverActions}>
              <button
                className={styles.secondaryButton}
                onClick={loadSample}
                type="button"
              >
                Load Demo Data
              </button>
              <a className={styles.downloadLink} download href="/sample-visits.csv">
                Download Sample CSV
              </a>
            </div>
          </div>
        </details>
      </div>
    )
  }

  return (
    <section aria-labelledby="data-source-heading" className={styles.section}>
      <div className={styles.sectionHeading}>
        <p>Data source</p>
        <h2 id="data-source-heading">Upload Visit Data</h2>
      </div>
      <div aria-busy={isLoading} className={styles.card}>
        <div
          {...dropHandlers}
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
        >
          <div className={styles.dropContent}>
            <span aria-hidden="true" className={styles.uploadIcon}>
              <svg fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            <p className={styles.dropTitle}>
              {isDragging ? 'Drop the CSV to begin' : 'Drop a CSV here'}
            </p>
            <p className={styles.dropCopy}>
              Use a visit export with the seven required columns. Files are processed locally.
            </p>
            <div className={styles.actions}>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Browse Files
              </button>
              {fileInput}
              <button
                className={styles.secondaryButton}
                disabled={isLoading}
                onClick={loadSample}
                type="button"
              >
                Load Demo Data
              </button>
              <a className={styles.downloadLink} download href="/sample-visits.csv">
                Download Sample CSV
              </a>
            </div>
            {fileHint !== null && (
              <p className={styles.fileHint} role="alert">
                {fileHint}
              </p>
            )}
          </div>
        </div>

        {showProcessing && (
          <div className={styles.processing} role="status">
            <span aria-hidden="true" className={styles.spinner} />
            Reading and checking {loadingFileName ?? 'your file'}…
          </div>
        )}

        <details className={styles.requiredColumns}>
          <summary>View Required Columns</summary>
          <p>{REQUIRED_COLUMNS.join(', ')}</p>
        </details>
      </div>
    </section>
  )
}
