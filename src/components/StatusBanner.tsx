import type { ParseError } from '../lib/types.ts'
import { VISIT_FILE_INPUT_ID } from './DataSourcePanel.tsx'
import styles from './StatusBanner.module.css'

type StatusBannerProps = {
  error: ParseError
  fileName: string
  previousFileName: string | null
  onLoadSample: () => void
  onRestorePrevious: () => void
}

export function StatusBanner({
  error,
  fileName,
  previousFileName,
  onLoadSample,
  onRestorePrevious,
}: StatusBannerProps) {
  return (
    <section aria-labelledby="upload-error-heading" className={styles.banner} role="alert">
      <span aria-hidden="true" className={styles.icon}>
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M12 3.8 21 20H3L12 3.8Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M12 9v5m0 3h.01"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <div>
        <h2 id="upload-error-heading">We Couldn’t Load This File</h2>
        <p className={styles.fileName}>{fileName}</p>
        <p>{error.message}</p>
        {previousFileName !== null && (
          <p className={styles.previousNote}>
            Your earlier file is still available and has not been replaced.
          </p>
        )}
        <div className={styles.actions}>
          <label className={styles.primaryAction} htmlFor={VISIT_FILE_INPUT_ID}>
            Choose Another File
          </label>
          <button onClick={onLoadSample} type="button">
            Load Demo Data
          </button>
          {previousFileName !== null && (
            <button onClick={onRestorePrevious} type="button">
              Return to {previousFileName}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
