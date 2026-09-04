# Pediatric Visit Dashboard

A browser-only React application that reads a CSV of pediatric visits and turns it into three KPIs: total visits, average wait time by location, and the top three visit reasons. Filters recalculate the KPIs, a data-quality summary explains every row that was skipped or adjusted, and an optional weather card adds daily weather context for a selected location. Nothing leaves the browser except a place name, coordinates, and a date range sent to a free weather API.

This is a take-home exercise, not a production system. See "Known limitations" and "What I would improve for production" before relying on it for anything real.

## Features

Implemented and tested today:

- CSV parsing with explicit, documented rules for every kind of bad or missing value
- Whole-file rejection with an actionable message when the file is empty, has no data rows, or is missing required columns
- A warning summary, one line per problem category, with capped row examples instead of hundreds of individual messages
- Pure filter functions: inclusive date range, single location, minimum wait time
- Pure KPI functions: total visits, average wait by location, top three reasons with a deterministic tie-break
- Weather context from Open-Meteo for one selected location and the visible date range, with cancellation, caching, and ten explicit states
- 127 unit tests on the data and weather logic, run in Node with no browser simulation

In progress (next phases of work):

- The upload panel with drag-and-drop, "Load sample data", and a downloadable sample CSV
- The dashboard views: KPI cards, the average-wait chart, the ranked reasons list, the filtered preview table, and the data-quality panel
- Until those land, the application mounts a temporary harness at `src/dev/ParserHarness.tsx` that exposes the parser, the filters, and the weather card for manual testing

## Technical stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 19 with TypeScript 6 | Required by the exercise; TypeScript makes "a wait can be null" a compiler-checked fact |
| Build and dev server | Vite 8 | `npm run dev` with hot reload and zero configuration for CSS Modules |
| CSV parsing | Papa Parse 5 | Correct handling of quoted commas, embedded newlines, byte order marks, and delimiter detection |
| Charts | Recharts 3 | Installed for the dashboard phase; not yet imported, so it adds nothing to the bundle today |
| Tests | Vitest 5 | Shares the Vite configuration, so tests run TypeScript with no extra setup |
| Lint | oxlint | Ships with the Vite template; `no-console` is set to error |
| Styling | Plain CSS with custom properties, CSS Modules for components | No framework needed for one page |

Deliberately absent: state libraries, routers, a backend, a database, authentication, date libraries, fetch wrappers, schema validators, UI kits.

## Prerequisites

- Node 22.12 or newer. Vite 8 and Vitest 5 both require it. An `.nvmrc` file pins `22` for nvm users.
- npm 10 or newer.
- No API key. The weather API is free and unauthenticated.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the URL printed in the terminal, normally http://localhost:5173. The temporary harness lets you choose a CSV, load one of the three sample files, and exercise the location and date filters with the weather card.

## Tests

```bash
npm test            # run once
npm run test:watch  # rerun on change
```

Tests live beside the modules they cover under `src/lib` and use two hardcoded eight-row fixtures. They never import React or touch the DOM.

## Lint

```bash
npm run lint
```

oxlint prints nothing on success. Add `-- --format=default` to see the file and rule counts.

## Production build

```bash
npm run build     # type-check with tsc, then bundle into dist/
npm run preview   # serve the built bundle locally
```

## CSV schema

Seven required columns, in any order. Extra columns are ignored.

| Column | Meaning |
|---|---|
| `visit_id` | Unique identifier for the visit |
| `patient_id_hashed` | Hashed patient identifier |
| `location` | Clinic location, ideally as `City, ST` |
| `visit_date` | Date of the visit in `YYYY-MM-DD` |
| `visit_reason` | Free-text reason |
| `wait_time_minutes` | Wait in minutes as a plain decimal number |
| `provider_id` | Provider identifier |

Example row:

```csv
visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes,provider_id
V100,h-100,"Bethesda, MD",2026-07-06,Fever,25,DR1
```

Any field containing a comma must be quoted, as `"Bethesda, MD"` is above. Three sample files are served from `public/samples/`: a clean twelve-row file, a file missing a column, and an eighteen-row file that triggers every warning category.

Real patient files must stay outside the repository. The `.gitignore` refuses every `.csv` except the tracked synthetic samples, so an export dropped in for testing cannot be committed.

## Required-column validation

The header row is checked before any data row is read.

- Header names are trimmed, and a UTF-8 byte order mark on the first header is removed.
- Matching is case-insensitive, so `Visit_ID` is accepted. Headers that matched only by ignoring case or spacing produce an informational warning naming them.
- Column order does not matter and extra columns are ignored.
- Two headers that collapse to the same required column, such as `location` and `Location`, reject the file, because guessing which one holds the data could pair the wrong values with the right name.
- Missing columns reject the file. The message lists the missing columns and the columns that were found. If the file name does not end in `.csv`, the message adds a hint that Excel workbooks must be saved as CSV first.
- A file with no bytes or only whitespace, and a file with a header but no data rows, are rejected with distinct messages.

## Row-level data-handling rules

Rows are processed in this order. A skipped row is counted once, under the first rule it failed.

| Situation | Decision | Why |
|---|---|---|
| Row has more or fewer cells than the header | Skip. Warning shows expected and actual column counts, never cell contents | Papa Parse neither pads nor flags ragged rows. Reading one by position would put values in the wrong fields, including a patient hash in the location field |
| `visit_id` blank | Skip | A visit with no identity cannot be counted or de-duplicated |
| `visit_date` blank or not `YYYY-MM-DD` | Skip. Warning shows the offending value and the expected format | Dates are the axis every filter and the weather lookup depend on. Guessing month versus day is worse than rejecting |
| `visit_id` repeats an earlier accepted row | Skip the later row | First occurrence wins. Comparison is case-sensitive after trimming |
| `location` blank | Keep. Stored as `Unknown` | Visits without a location still count toward totals and reasons |
| `visit_reason` blank | Keep. Stored as `Unspecified` | Same reasoning |
| `wait_time_minutes` blank, not a plain decimal, or negative | Keep. Wait stored as null | A missing wait must not become a zero, which would drag averages down. Hex, exponent notation, and overflow values are treated as nonnumeric |
| `patient_id_hashed` or `provider_id` blank | Keep. Placeholder `Unknown patient` or `Unknown provider` | The visit is still a visit |
| Text differs only by case or spacing from an earlier value | Keep. Folded to the first spelling seen | `Fever` and `fever ` are one reason. A location literally spelled `unknown` folds into the `Unknown` placeholder |

Dates are stored as canonical `YYYY-MM-DD` strings and compared as strings. No JavaScript Date object is ever created, so no timezone can shift a visit to a neighbouring day.

The parse result reports total rows, accepted rows, skipped rows, and normalized rows, plus one warning per category with a count, a plain-language message, and at most five example rows. Row numbers count data rows, where row 1 is the first row after the header.

## Filter behavior

- Date range is inclusive on both ends. Either bound may be empty.
- Location is single-select. "All locations" applies no filter. `Unknown` is a selectable value like any other.
- Minimum wait is inactive when the field is blank. When it is set, including at zero, only visits with a recorded wait at or above the threshold match. Visits with a null wait never satisfy an active threshold.
- Filters compose in the order date, location, wait. Every filter function returns a new array and never modifies its input.

## KPI definitions

- Total visits: the number of accepted visits after filters. Skipped rows never count.
- Average wait by location: the mean of recorded waits at each location, excluding nulls. Zero is a real wait and counts. A location with no recorded waits shows no average rather than zero. Locations sort by average descending, with no-data locations last.
- Top three visit reasons: reasons grouped after trimming and case-folding, sorted by count descending, then alphabetically for ties. The first spelling seen is displayed.

Averages are computed exactly and rounded only for display.

## API integration

The weather card uses two free, unauthenticated Open-Meteo endpoints:

1. Geocoding, `geocoding-api.open-meteo.com/v1/search`, to turn the selected location into coordinates.
2. Historical daily weather, `archive-api.open-meteo.com/v1/archive`, for the date range of the visible visits.

Why weather, and why this provider: pediatric urgent-care demand is plausibly weather-sensitive, so "what was the weather on these days" is a real question for anyone reading visit volumes. Open-Meteo is free, needs no key, supports browser requests directly, and offers daily history per location back to 1940. Static data such as population cannot vary by day and adds less.

Rules:

- A request is made only when exactly one real location is selected. "All locations" and `Unknown` never trigger a request, and the card says why.
- The date range is the overlap of the date filter and the visible visits, clamped to today because the archive rejects future dates. Ranges entirely in the future or before 1940 are explained without a request.
- The location text is split on its last comma. If the tail is a US state name or abbreviation, the result in that state is preferred; otherwise the API's first match is used. The matched place is always displayed so a wrong match is visible.
- Requested variables are daily mean, maximum, and minimum temperature in Fahrenheit and precipitation in inches.
- Changes are debounced for 300 ms. An in-flight request is aborted when the selection changes, and a response is discarded if its request key no longer matches the current selection.
- Successful responses are cached in memory for the session, keyed by request URL. Failures are never cached. Nothing is written to storage.

The card shows average temperature, total precipitation, and rainy days over the span, with the sentence "Shown for context only. Weather does not explain changes in visits or wait times." It reports weather on the same days as the visits and makes no causal claim.

## API failure behavior

Every outcome is a distinct state with plain copy: waiting for a single location, unknown location, no visits in range, future range, pre-1940 range, loading, no geocoding match, request failed, empty data, and success. A failed or slow request changes only the weather card. The KPI logic never receives weather data and cannot be affected by it. There is no retry button; the next filter change retries because failures are not cached.

## Privacy decision

Patient and provider data never leave the browser. The only outbound requests are the two weather calls, and they carry a place name, latitude and longitude, dates, variable names, and units. A unit test parses a real CSV, builds every URL the app can build from it, and asserts that no visit id, patient hash, or provider id appears in any of them. Warning examples never include a patient hash. The lint configuration makes any `console` call a build failure, so nothing can be logged. No analytics, no storage, no cookies.

## Assumptions

- Visit dates are date-only values. A visit on July 4 is July 4 everywhere.
- Locations follow the `City, ST` convention for best geocoding results. Bare city names still work through the API's first match.
- The data comes from a United States clinic chain, so temperatures are Fahrenheit and precipitation is inches.
- A blank threshold means no wait filtering, and zero is a meaningful threshold.
- "Today" is the browser's local date.
- Sample cities are plausible locations for a pediatric urgent-care chain in the Mid-Atlantic and were not verified against any real site list.

## Tradeoffs

- Strict `YYYY-MM-DD` dates. A spreadsheet that rewrites dates as `7/4/2026` loads with every row skipped and a message naming the format. Accepting US dates would have meant guessing whether `01/02` is January 2 or February 1. Failing loudly won.
- Ragged rows are skipped rather than repaired. Even a trailing empty cell that is provably harmless is rejected, which keeps one rule instead of two and matches the fail-loudly stance. A stray trailing comma on the header row alone would reject every row with a clear message.
- Case-insensitive headers instead of exact. Friendlier to exported files, at the cost of one extra rule for ambiguous duplicates.
- Papa Parse in array mode with hand-written header mapping, instead of its header mode. More code, but it is what makes duplicate-header detection and the ragged-row check possible.
- No chart on the weather card. A concise summary keeps the card from competing with the KPIs it is meant to contextualize.

## Known limitations

- The upload panel and dashboard views are not built yet. The current interface is a manual test harness.
- Parsing is synchronous. Files of a few thousand rows are instant; very large files will pause the page while parsing.
- Weather requests have no timeout. A connection that hangs rather than fails leaves the card in its loading state until the selection changes.
- A row with two compensating defects, such as an unquoted comma plus a missing field, keeps the expected cell count and cannot be detected by any count check. The weather URL test guards the one place such a value could leave the browser.
- Light theme only. Dark mode renders the light palette.
- Location matching for Washington, DC may fall back to the API's first result if its region is spelled differently than expected.

## What I would improve for production

- Move parsing to a Web Worker and stream large files.
- Add a request timeout and a retry control on the weather card, and a same-day join of daily visits with daily weather so the context is on one axis.
- Add end-to-end tests for the browser flows that unit tests cannot cover, and a CI workflow running lint, tests, and build on every change.
- Tolerate trailing empty cells if real exports prove they are common, with a test pinning the decision.
- Add a locale-aware date parser behind an explicit "my dates are month/day/year" switch rather than guessing.
- For a healthcare deployment: a formal data-handling review, an allowlist for outbound hosts enforced by Content Security Policy, and confirmation that hashed identifiers meet the organisation's de-identification standard before any file is uploaded to a browser at all.

## AI-assisted development and how the output was verified

AI use was encouraged by the exercise. I used Claude Code as a pair, and I kept the decisions and the verification.

How the work was organised:

- I wrote the requirements, including the data policies, and reviewed a written plan before any code existed. The plan recorded every assumption and served as the contract for later review.
- The work was built in small phases, each ending with a report of files changed, commands run, actual results, remaining risks, and the manual checks I should perform. I made every product decision in those reports, such as the strict date format, the placeholder wording, and the commit messages, and no commit was made without my approval.
- For the data and weather logic, tests were written first from hardcoded fixtures, and I checked the expected values by hand before the tests existed. One example: the Hoboken average of 10, 35, and 0 minutes is 15, and the Bethesda average excludes a null rather than counting it as zero.

How the output was verified:

- Every claim of "tests pass" or "build succeeds" was re-run rather than accepted from a report.
- The completed data layer went through an automated review with five specialist passes, covering leanness, documentation accuracy, test quality, security with a healthcare lens, and a verifier that re-ran every claim in the build log. Two independent reviewers then ruled on the result. The first round was remanded on one real defect: rows with a missing cell were read shifted by position, which could place a patient hash in the location field. That defect was reproduced, fixed with a new rule and tests, and the fix was re-reviewed and approved.
- The same review caught three claims in a fix log that had been asserted rather than performed, including a justification for removing a numeric guard that was simply false. Those were corrected.
- I tested the parser myself against several of my own files, and the browser flows were driven with Playwright against the live weather API, including a blocked endpoint to force the failure state and rapid filter changes to prove stale responses are discarded.
- A manual checklist covers what automation cannot judge: layout at small widths, screen-reader announcements, real spreadsheet exports, and slow networks.

The review logs are kept locally and are not committed.
