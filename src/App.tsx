import { useMemo, useState } from 'react'
import { AppHeader } from './components/AppHeader.tsx'
import { DataQualitySummary } from './components/DataQualitySummary.tsx'
import { DataSourcePanel } from './components/DataSourcePanel.tsx'
import { FilterBar } from './components/FilterBar.tsx'
import { KpiCards } from './components/KpiCards.tsx'
import { MethodologyFooter } from './components/MethodologyFooter.tsx'
import { StatusBanner } from './components/StatusBanner.tsx'
import { TopReasonsList } from './components/TopReasonsList.tsx'
import { VisitPreviewTable } from './components/VisitPreviewTable.tsx'
import { WaitByLocationChart } from './components/WaitByLocationChart.tsx'
import { WeatherContextCard } from './components/WeatherContextCard.tsx'
import { useWeatherContext } from './hooks/useWeatherContext.ts'
import { useVisitsLoader } from './hooks/useVisitsLoader.ts'
import { applyFilters, DEFAULT_FILTERS, locationOptions } from './lib/filters.ts'
import { computeKpis } from './lib/kpis.ts'
import type { Filters, Visit } from './lib/types.ts'
import styles from './App.module.css'

const EMPTY_VISITS: readonly Visit[] = []

function App() {
  const { state, statusMessage, loadFile, loadSample, restorePrevious } = useVisitsLoader()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const data = state.status === 'success' ? state.data : null
  const isLoading = state.status === 'loading'
  const visits = data?.outcome.visits ?? EMPTY_VISITS
  const filteredVisits = useMemo(() => applyFilters(visits, filters), [filters, visits])
  const kpis = useMemo(() => computeKpis(filteredVisits), [filteredVisits])
  const locations = useMemo(() => locationOptions(visits), [visits])
  const weather = useWeatherContext({
    location: filters.location,
    startDate: filters.startDate,
    endDate: filters.endDate,
    visits: filteredVisits,
    allVisits: visits,
  })
  const kpiAnimationKey = `${kpis.totalVisits}:${kpis.overallAvgWait ?? 'none'}:${kpis.locationCount}:${kpis.visitsWithoutWait}`

  function handleFile(file: File) {
    setFilters(DEFAULT_FILTERS)
    void loadFile(file)
  }

  function handleLoadSample() {
    setFilters(DEFAULT_FILTERS)
    void loadSample()
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
  }

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
        {data === null && (
          <DataSourcePanel
            data={null}
            isLoading={isLoading}
            loadingFileName={state.status === 'loading' ? state.fileName : null}
            onFile={handleFile}
            onLoadSample={handleLoadSample}
          />
        )}

        {state.status === 'error' && (
          <StatusBanner
            error={state.error}
            fileName={state.fileName}
            onLoadSample={handleLoadSample}
            onRestorePrevious={restorePrevious}
            previousFileName={state.previous?.fileName ?? null}
          />
        )}

        {data !== null && (
          <div className={styles.dashboard}>
            <section aria-labelledby="overview-heading" className={styles.overview}>
              <div className={styles.overviewHeader}>
                <div className={styles.overviewCopy}>
                  <p className={styles.eyebrow}>Visit analytics</p>
                  <h2 id="overview-heading">Overview</h2>
                  <p>
                    {filteredVisits.length} matching {filteredVisits.length === 1 ? 'visit' : 'visits'}
                    {' '}from {data.outcome.counts.accepted} accepted rows
                  </p>
                </div>
                <div aria-label="Dashboard controls" className={styles.overviewActions}>
                  <DataSourcePanel
                    data={data}
                    isLoading={false}
                    loadingFileName={null}
                    onFile={handleFile}
                    onLoadSample={handleLoadSample}
                  />
                  <FilterBar
                    filters={filters}
                    locations={locations}
                    matchingCount={filteredVisits.length}
                    onChange={setFilters}
                    onReset={resetFilters}
                    totalCount={visits.length}
                  />
                </div>
              </div>
              <KpiCards key={kpiAnimationKey} kpis={kpis} />
            </section>

            <div aria-label="Visit analysis" className={styles.analysisGrid}>
              <WaitByLocationChart onReset={resetFilters} stats={kpis.avgWaitByLocation} />
              <TopReasonsList reasons={kpis.topReasons} totalVisits={kpis.totalVisits} />
            </div>

            <div className={styles.lowerGrid}>
              <DataQualitySummary
                compact
                counts={data.outcome.counts}
                warnings={data.outcome.warnings}
              />
              <VisitPreviewTable visits={filteredVisits} />
              <WeatherContextCard state={weather} />
              <MethodologyFooter />
            </div>
          </div>
        )}

        <p aria-live="polite" className="visually-hidden">
          {statusMessage}
        </p>
      </main>
    </div>
  )
}

export default App
