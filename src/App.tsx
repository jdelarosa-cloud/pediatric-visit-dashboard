import { AppHeader } from './components/AppHeader.tsx'
import { ParserHarness } from './dev/ParserHarness.tsx'

function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#dashboard-content">
        Skip to dashboard content
      </a>
      <AppHeader />
      <main
        aria-label="Dashboard"
        className="page-container app-main"
        id="dashboard-content"
      >
        <ParserHarness />
      </main>
    </div>
  )
}

export default App
