<!-- Copied from the local review pipeline archive (.pipeline-runs/run3/PLAN.md) and scrubbed of the company name, the assignment file name, the recruiter's address, and local paths. Content otherwise unchanged. -->

# PLAN — Pediatric Visit KPI Dashboard

Status: approved by Josh in chat on 2026-09-03 with the recommended defaults.
This file is the contract for the ultra-orchestration pipeline. The builder implements it one phase at a time (section 8). The verifier and the council hold the build to the acceptance criteria in section 9.

## 1. Context

Take-home exercise for the hiring company, AI & Analytics Engineer I. The assignment PDF lives at `the assignment document` and is never committed.

Deliverable: a React app that launches with `npm run dev`, accepts a CSV of pediatric visits, and shows an interactive KPI dashboard with filters, unit tests on the data logic, one free public API integration, and a README.

Reviewers evaluate: how the problem is decomposed, how AI is used as a tool, how AI output is verified, the quality of design decisions, and whether a non-technical user can open and understand the result. Error-handling decisions will be defended in a debrief, so every policy below must be explicit and testable.

CSV schema (all seven columns required, any order):
`visit_id, patient_id_hashed, location, visit_date, visit_reason, wait_time_minutes, provider_id`

## 2. Working rules (binding on every phase)

- Build in phases (section 8). After each phase the orchestrator stops and reports to Josh: files created or changed, important decisions, commands run, actual results, remaining risks, manual checks, and a suggested commit message.
- No commit happens without Josh's approval. The orchestrator commits with the agreed message. The builder and fixer never run `git commit`.
- Never claim lint, tests, or build passed unless that command was actually run on the current tree. Paste real output.
- Business logic lives in `src/lib` as pure functions with zero React imports. Components format and display; they do not compute KPIs, parse, or filter.
- Unit tests cover `src/lib` only, run in the Node environment, and use hardcoded fixtures. No DOM, no React, no UI tests.
- No dependency beyond section 10 without a written reason in BUILD_LOG.md and orchestrator approval.
- Do not rewrite working files from earlier phases unless the current phase requires it. Flag every deviation from this plan in BUILD_LOG.md.
- Comments explain non-obvious WHY only, never WHAT.

## 3. Must-haves

- Runs with `npm run dev`. Scripts: `dev`, `build`, `test`, `test:watch`, `lint`, `preview`.
- CSV upload by drag-and-drop and by browse. "Load sample data" button. "Download sample CSV" link. Both use `public/sample-visits.csv`.
- Reject an empty file or a file missing required columns with a specific, actionable message (section 6, E-rules).
- Data-quality summary: accepted, skipped, normalized counts, per-reason breakdown, expandable list of flagged rows.
- Filters: inclusive date range, single location, minimum wait. Reset button.
- KPIs recalculated on every filter change: total visits, average wait by location, top three visit reasons.
- KPI cards, a bar chart for average wait by location with a table alternative, a ranked list for the top three reasons, a preview table of filtered rows.
- Loading, empty, success, warning, and failure states.
- Data policies P1 to P15 (section 6), each with at least one unit test.
- Weather context card using Open-Meteo geocoding and historical daily weather. Never sends patient IDs, provider IDs, visit IDs, rows, or the file. Never breaks the dashboard.
- README readable by a non-technical person (AC-14).
- Responsive layout, accessible controls (AC-13).

## 4. Out of scope and non-goals

- No Redux, Zustand, or React context. Props plus two hooks.
- No router, backend, proxy, database, or authentication.
- No Tailwind, UI kit, or CSS framework. CSS Modules plus one global stylesheet.
- No Web Worker parsing, no filter persistence, no CSV export, no sortable or paged table, no dark mode, no i18n.
- No caching beyond a session-scoped in-memory Map. No localStorage.
- No end-to-end test infrastructure committed. Manual browser checks happen per phase.
- No schema-validation library. Hand-written checks are the point of the exercise.
- No CSV export or copy-to-clipboard. If one is ever added, escape cells that start with `=`, `+`, `-`, or `@` at the export boundary, never at parse time, because parse-time changes would corrupt grouping (security audit, iteration 1).
- Optional, decided after Phase 7 only: visits-per-day bars on the weather chart; a small GitHub Actions workflow for lint, test, build; a deployed demo link.

## 5. Decisions and assumptions (these go in the README verbatim or paraphrased)

- D1 Repo: `~/dev/pediatric-visit-dashboard`, neutral name, default branch `main`. `.pipeline/` is gitignored; a curated summary of the AI workflow goes into README and `docs/ai-workflow.md` in Phase 7. `.gitignore` ignores `*.csv` everywhere except the tracked synthetic samples (`public/samples/*.csv`, `public/sample-visits.csv`), so a real patient export dropped into the repo for testing can never be committed (council iteration 1).
- D2 Node 22.12 or newer (required by Vite 8 and Vitest 5). `.nvmrc` says `22`; `package.json` has `engines.node >=22.12.0`; README states it.
- D3 Header matching is case-insensitive after trim and BOM strip. Extra columns are ignored. Any column order works.
- D4 "Empty" has three meanings. Zero bytes or whitespace only, and header with no data rows, both reject the file with distinct messages. A file where every row was skipped loads with a warning state and an empty dashboard because the file itself was valid.
- D5 If required columns are missing and the file extension is not `.csv`, the error adds a hint that Excel workbooks must be saved as CSV first.
- D6 Wait values must be plain decimal numbers: an optional minus sign, digits, and at most one decimal point (`12`, `12.5`, `0`, `-5`). Zero is valid; no upper bound. Anything else, including hex (`0x1A`), exponent notation (`1e2`), `Infinity`, and a leading plus sign, is nonnumeric and becomes null (P8). Negative plain decimals become null under `negativeWait`. Decided at council iteration 1 so spreadsheet artefacts are never silently accepted as minutes.
- D7 The wait threshold is active when the input is non-empty, including zero. Comparison is `wait >= threshold`. A hint under the field says visits without a recorded wait are excluded while it is set.
- D8 Placeholders: `Unknown` (location), `Unspecified` (visit reason), `Unknown patient`, `Unknown provider`. A location cell whose trimmed text case-insensitively equals `unknown`, or a reason cell equal to `unspecified`, is treated as that placeholder (P15 folds it in and counts the row as `textNormalized`), so a file that literally says "unknown" does not produce a second group beside the placeholder in the location list (council iteration 1).
- D9 Location filter is single-select with "All locations" as the default. `Unknown` sorts last.
- D10 Start date after end date applies literally, produces the filtered-empty state, and shows an inline hint.
- D11 Averages are computed exactly and rounded to one decimal only for display. A location whose visits all lack wait times shows "No wait data" and gets no bar.
- D12 A rejected upload clears any previously loaded dataset and shows the error with links to the sample CSV.
- D13 Weather date range = intersection of the date filter and the filtered visits' min and max dates, then clamped so the end is no later than today. An empty range shows the "no weather for this range" state. Confirmed by probe: the archive API returns HTTP 400 for any date after today.
- D14 Geocoding rule: split the location on the last comma. If the tail is a US state name or two-letter abbreviation, geocode the head and choose the result whose `admin1` matches that state. Otherwise take the API's first result. No country filter. The card always displays the matched place and region. Placeholder locations (`Unknown`) are never geocoded; a probe showed the literal string "Unknown" resolves to a village in Bangladesh.
- D15 Units: Fahrenheit and inches (`temperature_unit=fahrenheit`, `precipitation_unit=inch`). Daily variables: `temperature_2m_mean`, `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`. Timezone `auto`. Summary metrics shown as tiles: average daily mean temperature, total precipitation, rainy-day count (a day with precipitation of at least 0.01 in, shown as "N of M days"). The number of days with data appears in the date-span line, not as a fourth tile (orchestrator review, Phase 4b).
- D16 Sample data: about 80 rows, four locations in "City, ST" form (Bethesda, MD; Hoboken, NJ; Forest Hills, NY; Bayside, NY), eight reasons, dates in July 2026 so archive weather exists. Contains exactly one of each dirty case: duplicate visit_id, missing visit_id, invalid date, US-format date, blank location, blank reason, missing wait, nonnumeric wait, negative wait, missing provider_id, missing patient_id_hashed.
- D17 Privacy: data never leaves the browser except place names, coordinates, and dates sent to Open-Meteo. No console logging of rows. Amended at review run 2: since UI Phase A the page also requests two font families from fonts.googleapis.com and fonts.gstatic.com on load; that request carries no dashboard data, only the visitor's IP address and browser identity, and README discloses it. Self-hosting the fonts is a Phase E recommendation.
- D18 Concurrency: AbortController cancels in-flight weather requests when the request key changes, a key-equality guard discards late responses, a 300 ms debounce absorbs rapid filter changes, and a session Map memoizes geocode and weather results per key.
- D19 Charts: Recharts 3 (accessibility layer on by default). Average wait by location is a horizontal bar chart with value labels plus an adjacent table. Top three reasons is a ranked list with inline proportion bars, not a chart. Weather is a concise summary card with no chart (Josh's direction on 2026-09-03: keep it concise and isolated).
- D20 Row numbers in the quality summary count data rows, where row 1 is the first row after the header.

## 6. Data policies (each needs at least one unit test in `src/lib/*.test.ts`)

Rejection rules (whole file, `ok: false`):
- E1 `EMPTY_FILE`: zero bytes or whitespace only. Message: "The file is empty. Choose a CSV with a header row and at least one visit, or load the sample data."
- E2 `NO_DATA_ROWS`: header present, no data rows. Message: "The file has a header row but no visit rows."
- E3 `MISSING_COLUMNS`: message lists the missing required columns and the columns found. Adds the Excel hint per D5.
- E4 `PARSE_FAILURE`: the file could not be read as text (`file.text()` rejected). Raised only by `parseVisitsFile`; Papa Parse in array mode does not throw, so `parseVisitsCsv` has no catch block (council iteration 1 removed the unreachable one). Message: "The file could not be read as CSV: <reason>."
- E5 `AMBIGUOUS_COLUMNS`: two or more headers map to the same required column after trimming and case-folding (for example `location` and `Location`). Message names the column and the conflicting headers. Rejecting is safer than silently choosing one.

Row rules:
- P1 Reject the entire file if it is empty or missing a required column (E1 to E3).
- P2 Trim headers, strip a UTF-8 BOM from the first header, match column names case-insensitively, ignore extra columns, accept any column order. Headers that matched only by ignoring case or surrounding whitespace produce an informational warning naming them, so the user learns their file deviates from the schema. Parsing uses Papa Parse in array mode (`header: false`) and the app maps header names to column indexes itself, which keeps duplicate-header handling explicit (E5).
- P3 Skip rows with a missing `visit_id` (after trim).
- P4 Keep the first row for a `visit_id`; skip later duplicates. IDs compared after trim, case-sensitive.
- P5 Skip rows with a missing or invalid `visit_date`.
- P6 Blank `location` becomes `Unknown`. Row kept, counted as normalized.
- P7 Blank `visit_reason` becomes `Unspecified`. Row kept, counted as normalized.
- P8 Missing, nonnumeric, or negative `wait_time_minutes` is stored as `null`. Row kept, counted as normalized with the specific reason.
- P9 Null waits are excluded from averages and from the "with wait data" counts. Never treated as zero.
- P10 Missing `provider_id` becomes `Unknown provider`; missing `patient_id_hashed` becomes `Unknown patient`. Row kept, counted as normalized.
- P11 Visit dates are date-only canonical strings `YYYY-MM-DD`. No JavaScript Date at midnight, no timezone conversion. The only accepted input format is `YYYY-MM-DD` (Josh's decision on 2026-09-03; strict on purpose so a file exported in another format fails loudly instead of being guessed). Calendar validity is checked with pure arithmetic (2026-02-30 and 2026-13-01 are invalid). Anything else, including ISO datetimes and `M/D/YYYY`, is invalid and the row is skipped (P5). The warning for invalid dates shows the offending value and states the expected format.
- P12 Date filters are inclusive on both ends, compared as canonical strings.
- P13 Top visit reasons sort by count descending, then reason ascending, case-insensitive.
- P14 When the wait threshold is active (D7), visits with a null wait do not satisfy it.
- P15 Location and reason text are trimmed and internal whitespace collapsed to one space; grouping is case-insensitive; the first-seen spelling is displayed; affected rows count as normalized with reason `textNormalized`. Text that case-insensitively equals a placeholder folds into the placeholder (D8).
- P16 A data row whose cell count differs from the header's column count is skipped under `raggedRow`. Papa Parse in array mode neither pads nor reports short or long rows, and reading such a row by position would put cells in the wrong fields (a patient hash could land in `location`). The warning example carries the row number and the text `expected N columns, found M`, never any cell contents. This check runs before every other row rule.

Rule order per row: ragged row (skip, P16) -> missing visit_id (skip) -> missing or invalid visit_date (skip) -> duplicate visit_id among rows that passed the earlier checks (skip) -> normalizations. A skipped row is counted once, under the first rule it failed.

Parse result shape (`ParseOutcome`, the return type of both `parseVisitsCsv(text, fileName)` and `parseVisitsFile(file)`):
- `{ ok: false, error: ParseError }` where `ParseError` = `{ code: EMPTY_FILE | NO_DATA_ROWS | MISSING_COLUMNS | AMBIGUOUS_COLUMNS | PARSE_FAILURE, message, missingColumns?, foundColumns? }`.
- `{ ok: true, visits: Visit[], warnings: ParseWarning[], counts: ParseCounts }`.
- `ParseCounts` = `{ totalRows, accepted, skipped, normalized }` where `normalized` counts accepted rows with at least one normalization.
- `ParseWarning` = `{ code, kind: skipped | normalized | info, count, message, examples }`. One warning per category, never one per row. `message` is user-facing and includes the count. `examples` holds at most `MAX_WARNING_EXAMPLES` (5) entries of `{ row, value? }` where `row` is the data-row number (D20) and `value` is the offending cell (never a patient hash). Warning codes: `raggedRow | missingVisitId | missingVisitDate | invalidVisitDate | duplicateVisitId` (skipped); `blankLocation | blankReason | missingWait | nonnumericWait | negativeWait | missingPatientId | missingProviderId | textNormalized` (normalized); `headersNormalized` (info).
- Warnings are ordered: skipped kinds first, then normalized, then info; within a kind by count descending.
- Nothing in `src/lib` may call `console.*` or `fetch` except `openMeteo.ts` (Phase 6). Enforced by the oxlint `no-console` rule set to error.

## 7. Architecture

Data flow:
1. The upload control or the sample button yields a File. `useVisitsLoader` calls `parseVisitsFile(file)` (async, in `src/lib`), which reads the text and delegates to the pure, synchronous `parseVisitsCsv(text, fileName)`.
2. Both return the `ParseOutcome` discriminated union from section 6: `{ ok: false, error }` or `{ ok: true, visits, warnings, counts }`.
3. `App` holds three pieces of state: load state, the parse outcome, and filters. `applyFilters` and `computeKpis` results are memoized from those.
4. Components receive computed props and only format them.
5. `useWeatherContext` derives a request key from the selected location and the effective date range (D13), debounces, geocodes, fetches daily weather, and drops responses whose key no longer matches (D18).

Data model (in `src/lib/types.ts`):
- `Visit`: `visitId: string`, `patientIdHashed: string`, `location: string`, `visitDate: string` (canonical `YYYY-MM-DD`), `visitReason: string`, `waitTimeMinutes: number | null`, `providerId: string`, `sourceRow: number`.
- `Filters`: `startDate: string | null`, `endDate: string | null`, `location: string | null` (null means all), `minWait: number | null`.
- `Kpis`: `totalVisits: number`; `avgWaitByLocation: LocationWaitStat[]` where `LocationWaitStat` = `{ location, avgWait: number | null, visits, withWait }`, sorted by avgWait descending, nulls last, ties by location ascending; `topReasons: ReasonCount[]` where `ReasonCount` = `{ reason, count }` (max three); `visitsWithoutWait: number`.

Phase 3 functions (all pure, inputs never mutated, every function returns new arrays):
- `filters.ts`: `DEFAULT_FILTERS`; `filterByDateRange(visits, startDate, endDate)` inclusive on both ends, null bound means open; `filterByLocation(visits, location)` exact string match, null means all, "Unknown" is a normal value; `filterByMinWait(visits, minWait)` where null means no filtering and an active threshold keeps only `waitTimeMinutes !== null && waitTimeMinutes >= minWait` (P14, D7); `applyFilters(visits, filters)` composes the three; `locationOptions(visits)` sorted unique locations with "Unknown" last (D9).
- `kpis.ts`: `countVisits(visits)`; `averageWaitByLocation(visits)` grouping by the exact location string, averaging only non-null waits (P9), zero is a real wait, a group with no waits has `avgWait: null`, averages are exact (rounding happens in the UI, D11); `topReasons(visits, limit = 3)` groups reasons after trimming and case-folding, displays the first-seen trimmed spelling, sorts by count descending then reason ascending case-insensitively (P13); `computeKpis(visits)` assembles `Kpis`.

Phase 3 fixture (`FIXTURE_VISITS`, eight `Visit` objects in `src/lib/fixtures/visits.fixture.ts`). It deliberately bypasses the parser and carries one un-normalized reason (` fever `) because Josh asked for the KPI layer to trim and case-fold reasons on its own; it is not a sample of post-parse data:

| # | id | location | date | reason | wait |
|---|---|---|---|---|---|
| 1 | K001 | Bethesda, MD | 2026-07-01 | Fever | 25 |
| 2 | K002 | Bethesda, MD | 2026-07-02 | Cough | 15 |
| 3 | K003 | Bethesda, MD | 2026-07-03 | ` fever ` (leading/trailing spaces, lower case) | null |
| 4 | K004 | Hoboken, NJ | 2026-07-02 | Rash | 10 |
| 5 | K005 | Hoboken, NJ | 2026-07-04 | Fever | 35 |
| 6 | K006 | Hoboken, NJ | 2026-07-05 | Cough | 0 |
| 7 | K007 | Unknown | 2026-07-06 | Ear pain | null |
| 8 | K008 | Unknown | 2026-07-07 | Rash | null |

Expected results on the full fixture: total 8; average wait Bethesda 20 (25+15 over 2, the null excluded), Hoboken 15 (10+35+0 over 3, zero counts), Unknown null (0 with wait, 2 visits); order Bethesda, Hoboken, Unknown; top reasons Fever 3, Cough 2, Rash 2 (Cough before Rash alphabetically; Ear pain 1 excluded); visitsWithoutWait 3.
Expected results after filters: date 2026-07-02 to 2026-07-05 keeps K002 to K006 (5 visits, both boundary days included) with top reasons Cough 2, fever 2, Rash 1 (lower-case "fever" is correct here: K003's " fever " is the first row of that group inside the filtered set, and the display rule is first-seen trimmed spelling within the set being summarized; parser-produced data can never reach this state because P15 folds spellings file-wide); location "Unknown" keeps K007, K008; minWait null keeps all 8; minWait 0 keeps 5 (K001, K002, K004, K005, K006); minWait 15 keeps K001, K002, K005; date range plus location Hoboken plus minWait 10 keeps K004, K005.
- `ParseOutcome`, `ParseError`, `ParseWarning`, `ParseCounts` as in section 6. Weather types: `GeocodeMatch`, `DailyWeather`, `WeatherSummary`, `WeatherState` (`idle | loading | no-match | error | empty | success`).

UI states:
- Idle: no data loaded. Dropzone, "Load sample data", "Download sample CSV", one-line explanation of what the dashboard shows.
- Loading: reading and parsing, announced via `aria-live`.
- Failure: rejection banner with the actionable message and the sample links. Dashboard hidden (D12).
- Success: dashboard plus a neutral status line "Loaded N of M rows".
- Warning: success with skipped or normalized rows, amber quality banner with counts and a details toggle; also when every row was skipped (D4).
- Filtered-empty: "No visits match these filters" with a reset button; charts show an empty message instead of empty axes.
- Weather card states: idle hint ("Select a single location to see the weather for these visits"), loading, no-match, error ("Weather is unavailable right now. The dashboard still works."), empty, success with matched place, four tiles, chart, and the attribution "Weather data by Open-Meteo.com".


## 7b. Weather integration contract (Phase 4b)

Inputs to the feature, supplied by whatever owns the filters (the harness now, the filter bar in Phase 6): `location: string | null` (null means All locations), `startDate: string | null`, `endDate: string | null`, and the filtered `visits`. Nothing else crosses the boundary. Patient hashes, provider ids, visit ids, reasons, and waits are never read by the weather modules.

Modules:
- `src/lib/weather.ts` (pure, tested): `US_STATES` map (abbreviation and full name to canonical name); `parseLocationQuery(location)` splits on the last comma into `{ query, stateHint }` where `stateHint` is a canonical state name or null; `pickGeocodeMatch(results, stateHint)` returns the first result whose `admin1` equals the hint, else the first result, else null; `effectiveWeatherRange({ startDate, endDate, visits, today })` returns `{ kind: 'range', start, end }` after intersecting the filter bounds with the visits' min and max dates and clamping `end` to `today`, or `{ kind: 'no-visits' }`, `{ kind: 'future' }` (start after today), `{ kind: 'unsupported' }` (start before 1940-01-01); `summarizeDailyWeather(daily)` skips days with null values and returns `{ days, avgTemp, totalPrecip, rainyDays }` or null when no day has data; `weatherRequestKey(location, range)`; `weatherGate(location)` returns `'all' | 'unknown' | 'ok'` (Unknown placeholder never requested).
- `src/lib/openMeteo.ts` (I/O, URL builders tested): `buildGeocodeUrl(query)` with `count=10`, `language=en`, `format=json`; `buildArchiveUrl({ latitude, longitude, start, end })` with the D15 variables and units; `fetchGeocode(query, signal)` and `fetchDailyWeather(params, signal)` using native `fetch`, throwing a `WeatherRequestError` with `kind: 'network' | 'http' | 'shape'` and a plain message. The geocode response's `results` may be absent; the client returns an empty array in that case. An HTTP 400 from the archive with a `reason` string is surfaced as `kind: 'http'` with that reason.
- `src/hooks/useWeatherContext.ts`: takes the inputs above, derives the gate and the range, debounces changes by 300 ms, builds the request key, and manages one `AbortController`. On a key change it aborts the in-flight request. A response is applied only if its key still equals the latest key. A module-level `Map<string, unknown>` caches SUCCESSFUL geocode and archive results by URL for the session; in-flight requests are never shared, so an abort on one request can never poison another request for the same URL (orchestrator review, Phase 4b). Failures are not cached, so the next key change retries. No `localStorage`.
- `src/components/WeatherContextCard.tsx` plus CSS module: a leaf component that renders `WeatherState` and nothing else.

`WeatherState` (in `types.ts`):
- `{ status: 'idle', reason: 'all-locations' }` copy: "Select a single location to see weather context for its visit dates."
- `{ status: 'idle', reason: 'unknown-location' }` copy: "Weather context is not available for visits with an unknown location."
- `{ status: 'idle', reason: 'no-visits' }` copy: "No visits match the current filters, so there is no date range to look up."
- `{ status: 'unsupported', reason: 'future' | 'before-1940' }` copy for future: "Weather history is only available for dates up to today." For before-1940: "Weather history is available from 1940 onward."
- `{ status: 'loading', location, range }` copy: "Loading weather for {location}..." with `aria-busy="true"` on the card and a visible pulsing indicator; the rest of the page is untouched.
- `{ status: 'no-match', query }` copy: "We could not find "{query}" on the map. Try a location written as City, ST."
- `{ status: 'error', message }` copy: "Weather is unavailable right now. The dashboard still works without it." followed by the plain message on a second line.
- `{ status: 'empty', place, range }` copy: "No weather data was returned for these dates."
- `{ status: 'success', place, range, summary }` shows the matched place as "{name}, {admin1}, {country}", the date span with the days-with-data count, the three metric tiles from D15, the attribution "Weather data by Open-Meteo.com", and the disclaimer "Shown for context only. Weather does not explain changes in visits or wait times."

Phase 4b harness extension (temporary, deleted in Phase 5): after a successful parse, `ParserHarness` renders a location `<select>` built from `locationOptions` plus "All locations", two date inputs, and `<WeatherContextCard>` fed through `useWeatherContext` with `applyFilters` output. This is the only place the weather feature is mounted until Phase 6.

## 8. Folder structure and phases

```
pediatric-visit-dashboard/
├── .nvmrc
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── vite.config.ts                  Vite plus the Vitest block
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── README.md
├── docs/ai-workflow.md             Phase 7
├── public/
│   ├── favicon.svg
│   ├── sample-visits.csv           Phase 4 (the "Load sample data" file)
│   └── samples/                    Phase 2: valid-visits.csv, missing-column.csv, invalid-rows.csv
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── lib/
    │   ├── types.ts
    │   ├── headers.ts
    │   ├── dates.ts
    │   ├── normalizeRow.ts
    │   ├── parseVisitsCsv.ts       pure: text -> ParseOutcome
    │   ├── parseVisitsFile.ts      async: File -> ParseOutcome (reads text, delegates)
    │   ├── filters.ts
    │   ├── kpis.ts
    │   ├── weather.ts              pure: geocode choice, range, summary, gate, key
    │   ├── openMeteo.ts            I/O: URL builders, fetch wrappers, WeatherRequestError
    │   ├── fixtures/visits.fixture.ts
    │   └── *.test.ts               beside each module
    ├── dev/
    │   └── ParserHarness.tsx       TEMPORARY Phase 2 manual test panel; deleted in Phase 4
    ├── hooks/
    │   ├── useVisitsLoader.ts
    │   └── useWeatherContext.ts
    └── components/
        ├── UploadDropzone.tsx (+ SampleDataActions)
        ├── DataQualitySummary.tsx
        ├── StatusBanner.tsx
        ├── FilterBar.tsx
        ├── KpiCards.tsx
        ├── AvgWaitByLocationChart.tsx
        ├── TopReasonsList.tsx
        ├── VisitsPreviewTable.tsx
        └── WeatherContextCard.tsx  each with a .module.css beside it
```

Phases (one builder invocation each; report and approval gate after each; commit by the orchestrator):

| Phase | Scope | Commit message |
|---|---|---|
| 1 | Scaffold, tooling, `Visit` type, empty app shell (details below) | `chore: scaffold React TypeScript dashboard` (Josh shortened the proposed message at commit time) |
| 2 | `types.ts` (parse types added), `headers.ts`, `dates.ts`, `normalizeRow.ts`, `parseVisitsCsv.ts`, `parseVisitsFile.ts`, fixture, tests written first; `public/samples/` (valid, missing-column, invalid-rows); temporary `src/dev/ParserHarness.tsx` wired into `App.tsx`; oxlint `no-console` rule | `feat(data): parse and validate visit CSV with explicit data-quality policies` |
| 3 | `filters.ts`, `kpis.ts`, `FIXTURE_VISITS`, `Filters`/`Kpis` types; about eight focused tests written first against the expected results in section 7 | `feat(data): filters and KPI calculations with tie-break rules` |
| 4a | Carry-forward fixes CF-1 to CF-4 (data layer only) | `fix(data): restore finite wait guard, exhaustive warning-code test, pinned tie-break tests` |
| 4b | Weather integration, isolated: `weather.ts` (pure), `openMeteo.ts` (client), `useWeatherContext` (hook), `WeatherContextCard` (component), tests for the pure logic and the URL builders; the temporary harness gains a location select and date inputs so every state is reachable in the browser (re-sequenced by Josh on 2026-09-03; details in section 7b) | `feat(weather): Open-Meteo context card with cancellation and stale-response guard` |
| 5 | App shell wiring, `useVisitsLoader`, upload, sample actions, quality summary, status states, `sample-visits.csv`; the harness is deleted here (AC-18 now applies from Phase 5) | `feat(ui): upload, sample data, data-quality summary, and status states` |
| 6 | Filter bar, KPI cards, chart, ranked list, preview table, weather card wired to the real filters, responsive and accessible layout | `feat(ui): filters, KPI cards, charts, and preview table` |
| 7 | README, `docs/ai-workflow.md`, sample CSV polish, browser pass | `docs: README with setup, tests, API notes, assumptions, and AI workflow` |

### Phase 1 specification (current phase)

Deliverables:
- Scaffold from `create-vite` template `react-ts` (Vite 8, React 19, TypeScript 6.0, oxlint). Scaffold into a temporary directory and copy into the repo root so `.git`, `.gitignore`, and `.pipeline/` survive. Do not copy the template's `_gitignore`; the repo `.gitignore` already contains it plus `.pipeline/`.
- `package.json`: name `pediatric-visit-dashboard`, version `0.1.0`, `private: true`, `engines.node >=22.12.0`, scripts exactly: `dev` = `vite`, `build` = `tsc -b && vite build`, `test` = `vitest run`, `test:watch` = `vitest`, `lint` = `oxlint`, `preview` = `vite preview`.
- Dependencies added: `papaparse`, `recharts` (runtime); `vitest`, `@types/papaparse` (dev). Nothing else beyond what the template installs.
- `vite.config.ts` carries the Vitest block: environment `node`, include `src/**/*.test.ts`. No `passWithNoTests` (it would hide a broken include pattern).
- Remove template boilerplate: `src/App.css`, `src/assets/`, `public/icons.svg`. Keep `public/favicon.svg` until Phase 5 polish.
- `src/lib/types.ts` exports only the `Visit` type from section 7 with a short WHY comment on `waitTimeMinutes` and `visitDate`.
- `src/App.tsx`: a header with the h1 "Pediatric Visit Dashboard" and a one-sentence subtitle, and an empty `main` region. No state, no parser, no dashboard.
- `src/index.css`: minimal reset plus CSS custom properties for colors, spacing, and font. Light theme only. Small.
- `index.html`: `lang="en"`, title "Pediatric Visit Dashboard".
- `.nvmrc` containing `22`.
- `README.md`: short quick start only (Node 22.12+, install, dev, test, build, lint) and a note that full documentation arrives in Phase 7.
- Verification run by the builder and again by the orchestrator: `npm run lint`, `npm run build`, `npm test`, and a brief `npm run dev` smoke check. `npm test` is expected to report no test files and exit 1 in this phase; report it verbatim. Confirm the Vitest wiring with a throwaway test that is deleted before the phase ends.

## 9. Acceptance criteria (the verifier checks every one)

- AC-1 Tooling. After `npm install`: `npm run dev` serves the app; `npm run build` exits 0; `npm run lint` exits 0; from Phase 2 onward `npm test` exits 0 with all tests passing in the Node environment. All six scripts exist.
- AC-2 Node. `.nvmrc` is `22`; `engines.node` is `>=22.12.0`; README states the requirement.
- AC-3 Ingestion UI. Drag-and-drop and browse both work. "Load sample data" fetches `/sample-visits.csv`. "Download sample CSV" is a link to the same file with the `download` attribute.
- AC-4 Rejections. E1 to E4 produce the specified messages. E3 lists missing and found columns and adds the Excel hint per D5. The dashboard is hidden on rejection (D12).
- AC-5 Policies. Each of P1 to P15 and E1 to E5 has at least one unit test that names the policy in its description. Tests for `parseVisitsFile` construct a `File` with Node's global `File` class; no DOM library.
- AC-6 Quality summary. Shows total, accepted, skipped, and normalized counts, then one line per warning category with its count and at most 5 example rows with data-row numbers (D20). Never one line per row.
- AC-7 Filters. Native date inputs, a location select, a min-wait number input. Dates are inclusive. Reset restores defaults. Start after end shows the inline hint (D10).
- AC-8 KPIs. Recompute on every filter change. Total equals the filtered visit count. Average wait excludes nulls and shows "No wait data" where none exist. Top three follow P13.
- AC-9 Visuals. Horizontal bar chart with value labels plus an adjacent table for average wait. Ranked list with counts and share for top reasons. Preview table shows the first 25 filtered rows, all seven columns, and a "Showing X of Y" line.
- AC-10 States. Idle, loading, failure, success, warning, and filtered-empty states all exist and are reachable with the sample data plus a hand-made bad file.
- AC-11 Weather. Requests only when exactly one non-placeholder location is selected and the effective range is non-empty. Geocoding follows D14. Archive request uses D15 with the range clamped per D13. Every state in section 7b is implemented with the stated copy. The matched place is displayed. Attribution and the context-only disclaimer are present. A failing or slow weather request never changes the KPI area (the hook owns no KPI state and the card is a leaf component). Stale responses are ignored and identical requests are not repeated (D18). Pure logic and URL builders are unit-tested; the hook and card are verified manually in the browser, not with a mocked DOM.
- AC-12 Privacy. URL builders accept only place text, coordinates, and dates. A unit test asserts that a built URL contains none of the fixture's visit IDs, patient hashes, or provider IDs. No `console.*` anywhere in `src` (oxlint `no-console` = error). Warning examples never contain a patient hash, enforced by a structural test that triggers every warning code from one input and asserts no example `value` and no `message` contains any patient hash from that input, plus a test that a short row and a long row are both skipped as `raggedRow` and no accepted visit's location, reason, or provider equals a patient hash.
- AC-13 Accessibility. Every input has a visible label. The dropzone is keyboard operable. Status messages use `aria-live="polite"`. Charts have accessible titles and a table alternative. Focus styles are visible. Body text contrast is at least 4.5:1. The layout has no horizontal page scroll at 360 px and at 1280 px widths; wide tables scroll inside their own container.
- AC-14 README. Sections: overview with a screenshot; quick start with the Node version and the five commands; using the dashboard, written for a non-technical reader; CSV format with a data-policies table; weather API (what is sent, what is never sent, no key needed, attribution); assumptions; testing approach; project structure; how AI was used and verified.
- AC-15 Sample CSV. Matches D16 and loads into the warning state with the expected skip and normalization counts.
- AC-16 Architecture. `src/lib` contains no React imports. Components perform no parsing, filtering, or KPI math. Tests import only from `src/lib`.
- AC-17 Dependencies. Exactly the section 10 list.
- AC-18 Harness removal. From Phase 5 onward `src/dev/` does not exist and nothing imports it. The Phase 5 verification fails if it is still present (council iteration 1; phase number moved when weather was re-sequenced to Phase 4).
- AC-19 Deterministic ordering. Every `localeCompare` call pins `'en'` with `{ sensitivity: 'base' }` so sort order does not depend on the machine's default locale (council iteration 1).

## 9a. Carry-forward from review run 1 (Phases 1 to 3, closed 2026-09-03)

Review run 1 covered commits acfbd34, 422f61c, 4baefa8 and the fix commit 3e713ba. Iteration 1 was remanded (row-width check, data-file ignore rule) and iteration 2 approved. These items are binding on later phases:

- CF-1 (first data-layer touch, Phase 4 opening commit) Restore `Number.isFinite(parsed)` after the plain-decimal regex in `normalizeRow.ts` so a 309-plus-digit wait is `nonnumericWait`, with a test. Correct FIX_LOG item 3.
- CF-2 (same commit) Derive `ALL_WARNING_CODES` in `parseVisitsCsv.test.ts` from `Object.keys({...} satisfies Record<WarningCode, true>)` so the compiler fails when a code is added without coverage; make the comment true.
- CF-3 (same commit) Tests: a header with a stray trailing comma and a data-rows-only trailing empty cell both pin `accepted: 0` with `raggedRow` naming both counts; `locationOptions` and `averageWaitByLocation` tie-breaks with a case-only pair and an accent-only pair prove the `'en'` base-sensitivity pin; a row of only delimiters is absorbed by `skipEmptyLines: 'greedy'` and absent from `totalRows`.
- CF-4 (same commit) In `parseVisitsFile.ts`, call `parseVisitsCsv` inside the existing `try` so a thrown error becomes a `PARSE_FAILURE` outcome rather than a rejected promise.
- CF-5 (Phase 4, AC-10) When the parse outcome is `ok: true` with `counts.accepted === 0`, the dashboard shows "0 of N rows could be used" and leads with the highest-count skipped warning, never a blank dashboard.
- CF-6 (Phase 6, AC-12) The weather URL test asserts that no value from the loaded file's `patient_id_hashed` column appears in any built URL, using a parsed file as input rather than the fixture ids. This is the only control that catches a compensating double-defect row (unquoted comma plus one omitted field), which no count check can see.
- CF-7 (Phase 7, AC-14) README states that any field containing a comma must be quoted, and that real patient files must stay outside the repository.
- CF-8 (decision) Trailing empty cells beyond the header width are NOT tolerated; P16 stays strict. Revisit only if a reviewer's real export shows the asymmetric artifact. Accent-only-differing locations stay distinct groups (fold() is case-insensitive, not accent-insensitive) and sort adjacent under the base-sensitivity pin.
- CF-9 (process) BUILD_LOG and FIX_LOG claim only what was executed; three iteration-2 claims were asserted rather than performed and were caught by the auditors.

## 10. Dependencies

Runtime: `react`, `react-dom`, `papaparse`, `recharts`.
Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `@types/node`, `oxlint`, `vitest`, `@types/papaparse`.
Explicitly not allowed: jsdom, happy-dom, Testing Library, date libraries, fetch wrappers, state libraries, routers, UI kits, CSS frameworks, schema validators, ESLint, Prettier.

## 11. Pipeline mechanics

- The pipeline's `building` phase spans Phases 1 to 7. Each phase is one builder invocation scoped to that phase, then the orchestrator's own verification, then Josh's approval, then a commit by the orchestrator with the agreed message.
- `checkpoint` runs after the last approved commit. Because `.pipeline/` is ignored it commits nothing new and records HEAD as the review anchor. The orchestrator hands the auditors the full range from the first commit to HEAD, not only the anchor commit.
- The builder appends one `## Phase N` section per phase to `.pipeline/BUILD_LOG.md`.
- Fix iterations follow the same rule: fixer runs, orchestrator verifies, Josh approves, orchestrator commits, then `checkpoint`.

Status note: review run 1 (Phases 1 to 3) closed APPROVED on 2026-09-03; artifacts archived under .pipeline-runs/run1/. This run covers Phases 4 to 7 plus the CF-1 to CF-4 opening commit.

## 12. Review run 3 — final audit (2026-09-04)

Runs 1 and 2 are archived under `.pipeline-runs/`. Run 3 builds nothing: it is the final, whole-tree audit at commit 8327c38 before submission. Two lenses on top of the standard five:

- Requirements traceability against the assignment: (1) React app launching with `npm run dev` showing an interactive dashboard; (2) CSV upload matching the seven-column schema, rejecting an empty file or missing required columns with a clear, actionable error; (3) filters (date range, location, wait threshold) that drive total visit count, average wait by location, and top three reasons, displayed visually; (4) at least two unit tests on data logic using a 5 to 10 row hardcoded fixture, not the full CSV, not touching the UI; (5) explicit decisions for missing values, unknown locations, invalid dates; (6) a free public API adding meaningful context; (7) README with install, launch, tests, API keys or setup, assumptions. Evaluation criteria: decomposition, AI use, verification of AI output, design decisions, and whether a non-technical user can open and understand it. Anything not serving these is drift and must be named.
- Stability and efficiency: race conditions and stale state in the loader and weather hooks, error paths, render cost on filter changes, bundle size (622 kB minified, 186 kB gzip, dominated by Recharts for one single-series bar chart), synchronous parsing, memoization, event listeners, and anything that could throw at runtime on real-world input.
