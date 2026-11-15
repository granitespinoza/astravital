# System concept and scope

AI assistance: OpenAI Codex. Reviewed 2026-11-14 against the implemented dashboard.

## Step 0: problem and people

[Hypothesis] **One-liner:** Help a crew member understand a deviation in their resting heart rate and record an onboard review request without waiting for Earth.

[Evidence] NASA's [EIMO concept](https://ntrs.nasa.gov/citations/20250000009) motivates onboard support when ground assistance is unavailable or impractically delayed. It does not validate ASTRAVITAL.

| Role | Pain point / decision | Input | Output | Prototype boundary |
| --- | --- | --- | --- | --- |
| Crew member — primary user | Needs to understand an unusual reading and choose a next step | Scenario choice, simulated repeat, review request | Personal band, quality, explanation, local log | Implemented with synthetic data |
| CMO — intended reviewer | Needs the context behind a confirmed deviation | Future review of readings and rule | Human medical decision | Request is recorded locally; no CMO inbox or delivery |
| Mission operator / medical authority — proposed client or decision maker | Needs verifiable behavior without Earth connectivity | Future acceptance criteria and approved procedures | Test evidence and limitations | Role assumption; no customer validation |
| Flight surgeon — future user | Cannot respond immediately during an outage | Future delayed summary | Asynchronous advice | Not implemented |
| Sensor / Earth link — external systems, not users | Supply data / carry messages | Future physical measurements / transport | Future canonical data / delivery status | Synthetic fixtures / blackout label only |

The decision engine is a component, not a person or customer. The hackathon judges evaluate the demonstration; they do not validate medical safety.

## Scope that exists

[Simulation] One complete path: choose a resting heart rate scenario, inspect quality and personal deviation, simulate a repeat using the same baseline, record an onboard review request, reload offline, and export/import the local demo log.

[Verified result] Engine and browser checks are recorded in [RESULTADOS.md](RESULTADOS.md). The browser test disconnects networking; the blackout label alone is not an offline test.

## Assumptions and limits

- A1: one fictional crew member, one indicator, one reading per simulated sol, seed 142. See [data method](../data/README.md).
- A2: a 14-sol window, five minimum samples, WATCH at |z| >= 2, ALERT at |z| >= 3 and a 26-hour stale limit are configurable simulation choices, not clinical thresholds.
- A3: the user has loaded the static app once and waits for offline and local storage readiness. First installation still requires access to the host.
- A4: the CMO role and example actions describe a workflow; no actual clinician is notified. The repeat is generated, not manual sensor capture.
- A5: the local log is limited to predefined demo events. Export/import does not accept arbitrary medical measurements.
- A6: no workload, clinical accuracy, flight availability or storage-retention target has been validated. Do not invent one.

## Deferred capabilities

Skin temperature and other indicators; real sensor adapters; psychological assessment; voice/chat; individual forecasts; digital twins; environmental integrations; encrypted multi-device medical records; CMO inbox; habitat synchronization; Earth/DTN transport; lunar link profiles.

Preserve those directions as future options, not dependencies of the demonstration. No Azure medallion architecture is needed: this repository serves a local browser workflow, not a data platform.

Requirements and evidence live in [REQUISITOS-MVP.md](REQUISITOS-MVP.md); component ownership and error paths live in [ARQUITECTURA.md](ARQUITECTURA.md).

## Interactive web increment

The crew workflow is now accompanied by a detection laboratory and a selectable data-flow view. These explain and exercise the same local decision engine; they do not add medical indicators or external delivery. See [experience and design](DISENO-WEB.md).

## Product direction updated — 2026-11-15

Primary experience: **glasses-first crew display simulation**, with the dashboard supporting review. This supersedes dashboard-first presentation while preserving one completed signal and shared deterministic workflow. Browser output clips and typed-intent simulation are functional; native glasses, actual ASR, bone measurement and external delivery are not implemented. See [the decision](DECISION-VISOR.md).
