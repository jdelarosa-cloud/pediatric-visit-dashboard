import { AppHeader } from './components/AppHeader.tsx'
import { DataQualitySummary } from './components/DataQualitySummary.tsx'
import { DataSourcePanel } from './components/DataSourcePanel.tsx'
import { StatusBanner } from './components/StatusBanner.tsx'
import { useVisitsLoader } from './hooks/useVisitsLoader.ts'
import styles from './App.module.css'

function App() {
  const { state, statusMessage, loadFile, loadSample, restorePrevious } = useVisitsLoader()
  const data = state.status === 'success' ? state.data : null
  const isLoading = state.status === 'loading'

  return (
    <div className="app">
      <a className="skip-link" href="#dashboard-content">
        Skip to dashboard content
      </a>
      <AppHeader />
      <main
        aria-label="Dashboard"
        className={`page-container app-main ${styles.main}`}
        id="dashboard-content"
      >
        {data !== null && (
          <div className={styles.loadedSource}>
            <DataSourcePanel
              data={data}
              isLoading={false}
              loadingFileName={null}
              onFile={(file) => void loadFile(file)}
              onLoadSample={() => void loadSample()}
            />
          </div>
        )}

        {data === null && (
          <DataSourcePanel
            data={null}
            isLoading={isLoading}
            loadingFileName={state.status === 'loading' ? state.fileName : null}
            onFile={(file) => void loadFile(file)}
            onLoadSample={() => void loadSample()}
          />
        )}

        {state.status === 'error' && (
          <StatusBanner
            error={state.error}
            fileName={state.fileName}
            onLoadSample={() => void loadSample()}
            onRestorePrevious={restorePrevious}
            previousFileName={state.previous?.fileName ?? null}
          />
        )}

        {data !== null && (
          <DataQualitySummary counts={data.outcome.counts} warnings={data.outcome.warnings} />
        )}

        <p aria-live="polite" className="visually-hidden">
          {statusMessage}
        </p>
      </main>
    </div>
  )
}

export default App
