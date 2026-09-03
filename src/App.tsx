import { ParserHarness } from './dev/ParserHarness.tsx'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Pediatric Visit Dashboard</h1>
        <p>
          Upload a CSV of pediatric visits to see visit counts, wait times by
          location, and top visit reasons.
        </p>
      </header>
      <main aria-label="Dashboard">
        <ParserHarness />
      </main>
    </div>
  )
}

export default App
