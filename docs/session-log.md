# Session log

How this project was built with an AI coding agent, in order, with what I decided at each gate and what the reviews caught. The backing evidence is in [`review-record/`](review-record/): the plan that served as the contract, and the verdicts and final reports of three review runs. Commit hashes refer to this repository's history.

## Working agreement

I set the rules before any code existed: build in small phases; stop after each phase with a report of files changed, decisions, commands run with their actual output, remaining risks, and manual checks for me; never commit without my approval; never claim a command passed without running it; keep all calculations in pure functions outside React; add no dependency without a reason. Two sessions did the work. The first built the data layer and the weather integration and ran the audits; the second built the product interface from a written handoff and design draft.

## Day 1, 2026-09-03: plan and data layer

**Plan.** I gave the requirements and fourteen data-handling policies. The agent inspected the machine and the assignment, probed the weather API before proposing anything, and reported three findings that changed the design: the literal string "Unknown" geocodes to a real village, so placeholder locations must never be sent; "Bethesda" alone returns five matches, so a state hint is needed and the matched place must be shown; the historical archive rejects any future date, so ranges must be clamped to today. I approved the plan with its recommended defaults.

**Scaffold** (`acfbd34`). Vite, React, TypeScript, Vitest, Papa Parse, and Recharts. I shortened the proposed commit message.

**CSV ingestion** (`422f61c`). I asked for a function that takes a browser File and returns visits, user-facing warnings, a fatal error, and counts, with strict `YYYY-MM-DD` dates and "Unspecified" for blank reasons. Tests were written first from an eight-row fixture. The agent's own review before handing the phase to me found a British spelling in a user-facing message, an invisible byte-order-mark character reported as a header change, and a missing response check in the test harness. I tested the parser myself with several files before approving.

**Filters and KPIs** (`4baefa8`). I asked to see the expected values before any test existed. The agent calculated them by hand, including the check that a null wait is excluded rather than counted as zero, then wrote eight tests that encode those numbers. One expected value in its own spec was wrong and the builder flagged it rather than bending the code to match.

**First audit.** Five specialist auditors and a two-member council reviewed the whole data layer. Both council members independently reproduced one real defect: a row with a missing cell was read shifted by position, which could place a patient hash in the location field and, later, in an outbound weather request. The fix (`3e713ba`) added a row-width check, an ignore rule so real patient files can never be committed, a plain-decimal rule for wait times, and eight more tests. The re-review then caught three claims in the fix log that had been asserted rather than performed, including a false justification for removing a numeric guard. Those were corrected (`26b73ca`) and the layer was approved.

**Weather** (`c3f14c5`). I asked for the integration to be isolated from the core dashboard, with no patient or provider data ever sent, cancellation of stale requests, and no repeated calls. The agent built it with a debounce, an abort controller, a stale-key guard, and a session cache of successful responses, then exercised nine states in a real browser including a blocked endpoint and rapid filter changes. I asked for the weather card to be neater and for an honest answer about whether weather was meaningful context; the answer was that it was adjacent until joined to visits on the date axis, which is recorded as a future improvement.

**Documentation and interview preparation** (`9b7510f`). The README was written to the state of the code at the time, with the unbuilt interface marked as in progress rather than described as done.

## Day 2, 2026-09-04: interface, second audit, final audit

**Design.** The agent audited the temporary harness at three widths, read the design and accessibility skills available to it and said which applied, and produced a written direction and a clickable design draft with a state switcher. I reviewed the draft and asked for the weather card to be tidied. A handoff document carried the decisions to the second session.

**Interface** (`081fc9a` through `1e618b2`). The second session built the foundation, ingestion panel, filters and KPI cards, charts and preview table, and the weather card restyle, deleting the harness. Its own review run remanded twice and escalated once past the iteration cap, which I authorized; the fixes (`f1320bc`, `8327c38`) tightened the weather egress gate, restored one-decimal averages, and corrected documentation. A design mockup that had been committed to the repository root was removed (`af08d8e`) after an audit found the build log calling it untracked while git tracked it.

**Final audit.** With every commit in, I asked for the original assignment to be traced requirement by requirement and for a final audit for stability and efficiency. All seven requirements were verified by execution and in a real browser: rejections of empty, header-only, and missing-column files; filters changing every KPI, the chart, and the top-three list; one location producing weather with only a place name, coordinates, and dates on the wire. The council remanded on three additive items: a source comment claiming the weather gate stopped a case both reviewers had just reproduced it missing, and two untested edge cases. Those landed (`5b98b24`). The re-review found the documents still stated the old test count, which contradicted the README's own verification claim; corrected (`049f924`). The last iteration was approved unanimously.

## What was deliberately left as is

- The weather gate cannot recognize an alphabetic-only value that a malformed row shifted into the location column when it also ends in a recognized state and collides with no identifier. Both council members judged that no count or collision check can see it and that the proposed cures were riskier than the defect. It is disclosed in the README.
- The chart library is most of the bundle for one single-series chart. Replacing it was judged too risky without a fresh browser pass.
- Small formatting helpers inside components, a duplicated column list, and internal plan codes in test names are listed in the run-3 final report as post-submission cleanups.

## Verification, in one place

Every phase ended with `npm test`, `npm run lint`, and `npm run build` run on the tree as committed, with the output pasted into the report rather than summarised. The final state is 148 tests in 10 files, lint clean, build clean, at commit `049f924`.
