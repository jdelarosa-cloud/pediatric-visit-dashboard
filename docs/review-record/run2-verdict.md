<!-- Copied from the local review pipeline archive (.pipeline-runs/run2/VERDICT.md) and scrubbed of the company name, the assignment file name, the recruiter's address, and local paths. Content otherwise unchanged. -->

# VERDICT (review run 2)

## Iteration 1 — REMAND

Scope: commits 081fc9a (UI Phase A foundation) and 20bfe4d (tracked design mockup), anchor 20bfe4d.
Council: code-reviewer REMAND, quality-auditor REMAND. Consolidated: REMAND.
Auditors: lean 1 major 1 nit, docs 1 blocker, test 1 minor 1 nit, security 2 minor 1 nit, verifier 1 major 1 minor 1 nit.

Both council members rated the Phase A code correct and complete: tokens match the approved table, the rename left no dangling variables, focus and reduced-motion rules are real, tests, lint, and build reproduce at the logged figures. The remand is about the record and the repository contents, not the code.

### Must-fix (gating), all mechanical, none touching Phase A code

1. **Correct the build log.** `.pipeline/BUILD_LOG.md` "UI Phase A" states the preview file "remains an untracked design reference"; commit 20bfe4d tracks it. Replace the sentence with the truth and the decision below. This is the CF-9 failure mode one run after it was recorded.
2. **Log commit 20bfe4d.** Add a short build-log entry for it (what the file is, why it was committed, and its disposition), or make the entry describe its removal.
3. **Dispose of `dashboard-ui-preview.html`.** Preferred: remove it from the repository with `git rm` (the published artifact preserves the design; the file duplicates the token system and would drift over four more phases; the `*.csv` ignore rule cannot protect an HTML mock from future pasted rows). If it is kept instead, record the decision, add a header comment stating every value is fabricated and real rows must never be pasted, and add one README line.
4. **Record the Google Fonts request as an assumption.** PLAN D17 names Open-Meteo as the only outbound request; `index.html` now loads two font families from Google Fonts on every page load, which sends the visitor's IP address and browser identity to a third party, while the header shows a privacy shield. The header sentence stays true (no CSV or filter data leaves). Add the disclosure to README's privacy and assumptions sections; PLAN D17 is amended by the orchestrator. Self-hosting the fonts is recommended for Phase E and does not gate.

### Not gating

- The three-width browser claim in the build log is unreproducible without a browser; the plan defers the Playwright pass to Phase E and the CSS is consistent with the claim. Future logs must say "checked manually, not reproducible" rather than stating measurements as verified.
- Lean nit: a one-line WHY comment above the global element selectors in `src/index.css`.
- The mockup's untested inline script, moot if the file is removed.

Re-review scope for iteration 2: the fix diff only (`BUILD_LOG.md`, `README.md`, the removal or annotation of `dashboard-ui-preview.html`, `src/index.css` comment if added).

## Iteration 2 — REMAND

Scope: the completed UI run at `af08d8e`, reviewed across `9b7510f..af08d8e` so the final product phases were not hidden by the checkpoint's one-commit fix-diff hint. Council: code-reviewer REMAND, quality-auditor REMAND. Consolidated: REMAND.

Auditors: lean 2 minor; docs 2 major, 3 minor, 1 nit; test 2 major, 2 minor; security 2 major, 1 minor; verifier 5 major, 6 minor, 1 nit. Both council members independently reproduced the central failures. They also confirmed the intended visual direction, responsive and equal-height composition, masked identifiers, isolated weather state, reduced-motion treatment, clean dependency scope, 134 passing tests, zero lint findings, and successful production build.

### Must-fix (gating)

1. **Protect the weather egress boundary (AC-12 / CF-6).** A seven-cell row with an unquoted comma plus an omitted field can map an identifier marker into `Visit.location`, and the hook will geocode it. Add a conservative, documented pre-request location policy or equivalent provenance guard. Add the exact compensating-defect regression and prove its marker cannot enter a weather URL/request.
2. **Narrow the CSV ignore exceptions.** Replace `!public/samples/*.csv` with exact exceptions for the three tracked focused fixtures; retain the exact primary demo exception. Verify allowed and disallowed paths with `git check-ignore`.
3. **Restore one-decimal KPI display (D11 / AC-8).** Replace whole-minute rounding in Overview, add fractional assertions for `averageWait` and `averageWaitByLocation`, and verify a fractional filtered view agrees with the chart.
4. **Restore the contracted weather-state sentences (AC-11).** Keep the polished headings/layout, but use the complete required idle, unsupported, loading, no-match, error, empty, and success copy, including visible loading and the full recovery/non-causal guidance. Exercise all states manually.
5. **Repair rejection-state accessibility and overflow (AC-13).** A near-limit filename must wrap or truncate without widening the page at 1280 or 360 px. `Choose Another File` must be a real keyboard-operable control connected to the file input.
6. **Correct reviewer-facing documentation (AC-14 / CF-9).** Qualify the two false categorical egress statements around Google Fonts; describe URL construction rather than untested API response-validation coverage; say `invalid-rows.csv` triggers most warning categories; describe `console` as a lint failure; narrow the `Date` statement to visit dates; and update the compensating-defect limitation/privacy-test explanation to match the repaired control.
7. **Re-run and record evidence.** Tests, lint, build, malformed-row URL proof, exact `.gitignore` probes, fractional KPI browser check, long-filename overflow at 1280/360, keyboard recovery, and all weather states.

### Not gating

- Importing the canonical `REQUIRED_COLUMNS` tuple into `DataSourcePanel` is a worthwhile tiny deduplication but not required for approval.
- Removing the now-unused non-compact `DataQualitySummary` path is lean cleanup, not a functional defect.
- Open-Meteo fetch-wrapper unit tests exceed the approved minimum; correct the documentation rather than expanding infrastructure solely to match the overclaim.
- Recharts bundle size, synchronous very-large-file parsing, the lack of a weather timeout, and self-hosting fonts remain documented production follow-ups.

Iteration 3 is a bounded correction pass. It must preserve the approved visual system and symmetric layout and must not add a dependency or broaden the redesign.

## Iteration 3 — REMAND / ESCALATE

Scope: correction commit `f1320bc`. Council: code-reviewer REMAND, quality-auditor REMAND. Consolidated: REMAND. This is the configured maximum iteration, so the state machine must escalate to Josh rather than starting another fix automatically.

Auditors: lean clean; docs 1 minor; test 1 major; security 1 major; verifier 1 minor. Both council members independently reproduced the two privacy failures. They also verified that every other iteration-2 requirement is closed: exact CSV exceptions, one-decimal KPI consistency, contracted weather copy, visible loading status, error overflow and keyboard recovery, documentation corrections, compact symmetric responsive layout, 140 passing tests, clean lint, successful build, and unchanged dependency manifests.

### Must-fix (gating)

1. **Make the state allowlist own-key-safe.** `US_STATES[tail]` reads inherited properties from the normal object. `__proto__` and `constructor` therefore pass as recognized states, `weatherGate` returns `ok`, and arbitrary text can reach the geocoding URL. Use a `Map`, null-prototype lookup, or own-property check; add end-to-end pure-boundary regressions proving these suffixes cannot create a query or URL.
2. **Enforce AC-12 against allowed-shape identifier collisions.** The current tests use identifier markers that the letters-only location regex rejects by construction. A parsed `patient_id_hashed=deadbeefcafebabefeedface` and another location `deadbeefcafebabefeedface, MD` pass the gate and put that exact patient hash in the geocoding URL. Before URL construction, collision-check an otherwise safe query against every accepted visit's patient hash, visit ID, and provider ID from the full loaded dataset, or use another explicit trusted-place boundary that proves the same invariant. Add a grammar-valid collision regression and make the broad positive-path privacy test assert it actually built a URL.

### Required minor cleanup in the same bounded pass

- README's `Every outcome` weather-state inventory must include the new invalid/unsupported-location-format state.
- Recapture `docs/dashboard.png` after chart labels have fully settled; the current image is functional and accessible but was captured during its entrance animation.

### Verification required after an authorized extra iteration

Run the targeted weather/privacy tests, full suite, lint, build, prototype-key probes, parsed allowed-shape collision probe, and a positive allowed-location request-path probe. Confirm the UI layout is unchanged and record actual results. No dependency or broader redesign is justified.

### Deferred, non-gating

The canonical required-column import, unused non-compact data-quality mode, Open-Meteo response-wrapper tests, Recharts bundle advisory, weather timeout, synchronous very-large-file parsing, and font self-hosting remain optional or documented follow-ups.

## Iteration 4 — APPROVED

Scope: correction commit `8327c38`. Council: code-reviewer APPROVED, quality-auditor APPROVED. Consolidated: APPROVED.

Auditors: lean 1 minor; documentation, security, test, and verifier clean. Both council members independently confirmed that the iteration-3 privacy remand is closed at the real pre-request boundary and that the minor lean finding has no functional, privacy, accessibility, or acceptance impact.

### Gating items closed

1. State recognition now uses an own-property check, so `__proto__`, `constructor`, and other prototype-chain keys cannot masquerade as recognized states or create a geocoding URL.
2. An otherwise valid city query is compared case-insensitively with every patient hash, visit ID, and provider ID in the full accepted dataset. The full dataset remains available to the weather hook even when filters hide the identifier-bearing row, while filtered visits continue to determine only the date range.
3. The suite retains the original `patient-secret-900` malformed-row regression and adds prototype-key rejection, grammar-valid collisions across all three identifier fields, full-versus-filtered proof, a non-vacuous broad URL path, and a positive Bethesda request path.
4. README and the AI-workflow record match the 146-test implementation, the full-dataset privacy boundary, and all weather states. The screenshot was recaptured after the chart labels settled.

### Verification

- Focused weather/privacy tests: 36 passed.
- Full suite: 10 files, 146 tests passed.
- Lint: 0 warnings and 0 errors across 40 files.
- Production build passed; only the documented Recharts chunk advisory remains.
- Commit/diff integrity is clean; package manifests did not change.
- Browser verification at 1440, 1024, 768, 390, and 360 px found no document overflow, preserved equal-height adjacent cards, internal table scrolling, Overview-first order, and consistent `14.5` fractional KPI/chart display.
- A real file-input collision probe produced the local unsupported state and zero Open-Meteo requests; a Bethesda selection emitted the expected geocoding request.

### Deferred, non-gating

The hook currently derives eligibility and the parsed query with two identical full-dataset scans per render. This is correct and negligible for the intended small files, but a future cleanup can compute or memoize the safe result once. The canonical required-column import, unused non-compact data-quality mode, Open-Meteo response-wrapper tests, bundle optimization, weather timeout, large-file worker parsing, and font self-hosting remain documented optional or production-hardening work.
