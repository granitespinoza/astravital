# Verification results

AI assistance: OpenAI Codex. See [SI usage](SI-USAGE.md).

## Local decision engine

[RESULTADO COMPROBADO] **9 passed, 0 failed** on Node.js 24.22.1 with the `Personal resting heart rate z-score v0.1` rule. From the repository root, run:

```sh
node --test tests/engine.test.js
```

The suite checks that the baseline uses only earlier, valid readings from the same astronaut and measurement context. It checks the rolling window boundaries, positive and negative WATCH and ALERT thresholds, zero variance, distinct data quality states, descriptive slope, and simulated source labeling. In the frozen-baseline test, a follow-up reading remains at ALERT with the saved baseline after 14 shifted readings would have brought it to OK against the rolling baseline.

[SIMULACIÓN] The replay uses seed **142** and a fresh pseudorandom stream for each scenario and window. Each run warms up with 28 sols and scores the following 60 sols. It generates one resting reading per sol by rounding a uniform draw between 57 and 65 bpm. A sol lasts 88,775,000 ms in the simulation. S1 adds no event. S2 adds 1.5 bpm on sol 21, then another 1.5 bpm per sol for a total of ten elevated readings. S3 adds 20 bpm to the reading on sol 21 only. In S2 and S3 the replay freezes the baseline at the first flagged event reading for the rest of the injected event. The tests use `|z| ≥ 2` for WATCH, `|z| ≥ 3` for ALERT and a minimum of five valid baseline readings.

[RESULTADO COMPROBADO] The replay counts either WATCH or ALERT as one flag per observation. Detection delay is measured from the first elevated observation. The test command prints one diagnostic record per window.

| Baseline window | S1 false flags / 60 crew-sols | S1 false flags per crew-sol | S2 delay to first flag | S2 flagged event sols / 10 | S3 delay to first flag | Missed events / 2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 7 sols | 4 | 0.0667 | 5 sols | 5 | 0 sols | 0 |
| 14 sols | 2 | 0.0333 | 5 sols | 5 | 0 sols | 0 |
| 28 sols | 1 | 0.0167 | 1 sol | 8 | 0 sols | 0 |

All S1 flags were WATCH. S4 produces separate outcomes for a suspect signal and a reported device disconnect. S5 covers three missing sols and recovery. It also checks that a retained reading becomes stale after 26 hours. These quality outcomes suppress the deviation alert for the affected reading.

[HIPÓTESIS] The interruption estimate counts flagged sols. It has no measured estimate of time spent repeating a reading or waiting for an onboard review. The replay uses one noise sequence, one crew member and two injected events per window. It provides a software check under those assumptions. A choice of operating window or claims of clinical performance require representative data and further evaluation. See [simulation inputs](../data/README.md).

[RESULTADO COMPROBADO] The engine and scenario generator passed strict JavaScript type checking with TypeScript 6.0.3. With the compiler available, reproduce the check with:

```sh
tsc --allowJs --checkJs --strict --noEmit --target es2022 --module nodenext app/engine.js app/scenarios.js
```

## Offline dashboard

[RESULTADO COMPROBADO] The browser integration suite passed on Node.js 24.22.1 with Chrome 157.0.8103.78 and Edge 157.0.4341.46. From the repository root, run:

```sh
node tests/browser.mjs
```

The suite opened the static app on localhost, checked the desktop and mobile layouts and all five data quality states, then disabled browser networking. It recorded a repeat reading and an onboard review request. Reloading fetched the document from the service worker and restored the reading and log from IndexedDB. The suite closed the simulated review, exported the three records offline and imported the same backup twice into a fresh browser profile without duplicating records. It observed zero HTTP requests from the dashboard to external origins.

[SIMULACIÓN] The Mars blackout models the crew workflow. The browser network disconnection tests actual software behavior. The CMO request stays in the local log. The habitat network and Earth delivery remain architecture concepts.

## Repository organization verification — 2026-11-14

[Verified result] Before documentation cleanup, the feature tip was `d675105`. On this machine, Node.js **v26.6.0** ran `node --test tests/engine.test.js`: **9 passed, 0 failed**, with seed 142 and the same window-comparison diagnostics shown above.

[Verified result] `node tests/browser.mjs` passed with **Chrome/157.0.8103.51** in a temporary profile: responsive layout, five distinct quality states, offline repeat and local review request, reload with saved records, export/import without duplicates, and zero external HTTP requests from the dashboard. The test used a local server and did not access the user's normal browser profile.

[Evidence] This pass changes documentation and project-agent instructions only. Runtime source, fixtures, server and tests are retained byte-for-byte. The earlier TypeScript result above was not rerun: a `tsc` executable was not found in this session. Clinical validation, a public deployment and final submission were not performed. See [organization record](ORDEN-REPO.md) and [submission gaps](ENTREGA.md).

[Verified result] Post-cleanup checks: `git diff --check` passed; `git diff --exit-code -- app tests data scripts` reported no changes. A local scan of 24 Markdown files found **0 broken relative links**; all **6 project-skill files** match between `.claude/skills/` and `.agents/skills/`. Markdown size fell from 142,845 to 107,765 bytes before adding this final verification note (24.6% reduction). These are repository checks, not product-performance metrics.

## Interactive web implementation — 2026-11-14

[Verified result] `node --test` passed **17 tests, 0 failed** on Node.js **v26.6.0**: 15 engine tests and 2 scenario regression tests. Added cases cover invalid clocks/policies/current fields, duplicate and conflicting history IDs, invalid frozen snapshots, empty history, shared trace execution and lab/overview parity. The original replay metrics are unchanged. All eight lab scenarios preserve the crew overview's 14-sol decision before an input override.

[Verified result] `node tests/browser.mjs` passed on **Chrome/157.0.8103.51**. It exercises all three hash views, 7/14/28-sol lab windows, a high synthetic input, a blank invalid input, reset, no lab writes to the event log, stage selection, device-fault blocking and skipped downstream stages. Desktop and 390 px mobile views fit without horizontal overflow. Offline reloads of `#crew`, `#detection` and `#architecture` all pass. The engine explorer and three local fonts are present in Cache Storage. The earlier repeat/review/reload/export/double-import journey still passes, with zero external dashboard HTTP requests.

[Verified result] The new navigation exposed an offline regression: fragment-bearing document URLs did not match the shell cache. The service worker now removes the fragment for shell lookup and cache matching, and releases cache version v3. The browser test reproduces and covers all three affected routes. The previous v2 iteration failed this check and was corrected before delivery.

[Evidence] Screenshots were visually reviewed for desktop and mobile. Space Apps colors and local licensed fonts are recorded in [DISENO-WEB.md](DISENO-WEB.md). Basic keyboard focus, text/icon states and reduced-motion support are present; no claim of full accessibility compliance or representative-user validation is made. No public deployment, remote push, clinical validation or external delivery was performed.

## Glasses-first simulation — 2026-11-15

[Evidence] Published UX research branch `docs/investigacion-ux-lentes`, commit `113f0c8b20a6e1cc4134e80069483b18ada8a57d`, was integrated locally by merge `34d7832`. Prior uncommitted application/documentation work was preserved. A full pre-change archive was created, including `.git`.

[Verified result] `node --test` on Node.js v26.6.0: **23 passed, 0 failed** (15 engine, 2 fixture/lab, 6 shared-workflow/HUD tests). Version-1 event payloads retain their previous golden hashes. The same detector, repeat baseline and record IDs serve both interfaces; degraded HUD states suppress current numbers and permitted typed intents require complete whitelist matches.

[Verified result] `node tests/browser.mjs` passed on Chrome/157.0.8103.51 after the final visual/read-only adjustments. It retains the complete console journey at `/review.html` and tests the primary visor at `/` in a separate temporary profile. Cases: WATCH, requested body context, no bone measurement, repeat -> ALERT, request confirmation/cancel, rejected unknown/unarmed intents, injected save failure without success, retry/read-back, idempotent double action, offline saved-state reload and shared export/import with the console. The three console views still reload offline. External dashboard HTTP requests: zero.

[Verified result] The browser check found all five local WAV assets in cache and validated their RIFF payloads. Instrumented audio calls verify muted default, one cue per state and explicit replay; microphone/ASR API calls were zero. Audio rendering was instrumented: acoustic intelligibility, leakage, actual glasses output and real speech recognition were not measured. Each generated PCM file also has nonzero audio frames. Cache version is v5 and includes both interfaces, domain modules, fonts and clips.

[Verified result] Desktop/mobile and body-detail captures were reviewed at 1280/390 px. The requested body panel replaces the compact card, avoiding overlapping text. Relative Markdown links resolve, both agent-skill mirrors match and `git diff --check` passes. These checks do not establish human comprehension or AR readability.

[Hypothesis] SPECS 27 is the selected design reference. Native Lens/physical glasses, offline ASR, background monitoring, sensor acquisition, native persistence, clinician delivery and bone analysis remain unimplemented or unverified. See [decision](DECISION-VISOR.md) and [bone evidence](SALUD-OSEA.md). The software records a local simulated request, never a diagnosis or delivered consultation.

## Local API, medallion data and real voice increment — 2026-11-15

[Evidence] New acceptance scope is [REQUISITOS-MVP.md](REQUISITOS-MVP.md): Node.js 22.13+ (26 recommended), SQLite layers, two structured domains, API persistence, and microphone transcription with installed local artifacts. Earlier 23-test browser-only results are historical; they do not validate these new capabilities.

[Hypothesis / pending verification] Record the actual results before marking this increment complete:

- Clean `npm ci`, `npm run setup:voice`, and `npm run demo`; exact Node/OS/compiler/model/binary versions and hashes.
- Automatic initial seed and idempotent `npm run seed`; layer counts/provenance and quarantine cases.
- `/health`, both domain states, evidence queries and persisted idempotent reviews; transaction failure without success.
- Contextual assistant follow-up, domain change, ambiguity and unsupported question behavior.
- Known WAV fixture transcription plus a separate real microphone/permission-denial/noise/silence test; no typed substitute accepted as microphone evidence.
- WAN-disconnected local path with localhost accessible; no external runtime dependency after setup. Distinguish that from DevTools Offline cache checks.
- Domain/data/API tests, browser journey, Docker image/startup and any actual limitations/failures.

[Evidence] Azure scaffold is optional and disabled by default. No account login, resource deployment, PostgreSQL/Speech adapter, cloud persistence, clinical validation or public URL is established by this documentation update. Azure CLI and Bicep CLI were not found in PATH during the initial check; a later compiler-only validation, if performed, must be recorded explicitly.

[Verified result] Infrastructure **compilation only**: the official standalone Bicep CLI **v0.49.2 (b34271ac51)** compiled `infra/azure/main.bicep` into an ARM JSON file with exit code 0 and no diagnostics. The compiler was downloaded into the chat's temporary work directory; no global CLI install or Azure sign-in occurred. Template parameters default `enableInfrastructure=false` and `enableEphemeralApiPreview=false`. No deployment/what-if, billing, resource availability, live identity permissions or cloud behavior was tested.

## Claude continuation: lens entry, local voice and judge documentation — 2026-11-15

AI assistance: Anthropic Claude. Machine: macOS, Node 22.23.2, seed 142.

| Check | Command or method | Result |
| --- | --- | --- |
| Build and full suite | `npm run verify` | 59 tests: 57 passed, 0 failed, 2 skipped (opt-in integration tests) |
| Local neural voice (Kokoro) with network guard | `RUN_TTS_INTEGRATION=1 node --test tests/tts.test.js` | 4/4 passed |
| Local speech recognition on synthetic speech | `RUN_VOICE_INTEGRATION=1 node --test tests/voice.test.js` | 6/6 passed |
| New voice route `/api/speak` | `node --test tests/api.test.js` (new test: readiness, text validation, cross-origin block) | 7/7 passed |
| Synthesis latency | Direct `synthesize()` calls on two Astra sentences | About 2.7–3.0 s per sentence, including model load in an isolated process |
| Lens entry in the browser | Manual check on `http://127.0.0.1:4173/`: ripple invitation, approach, pass through the lens, iris flash, staggered visor boot, replay control | Works as described. By design (code), reduced-motion users skip the animation; not checked in the browser |
| Body context | Manual check: heart and left hip each with halo, ring and label; selected zone pulses | Works; illustrative anatomy, not a scan |
| Voice reply in the browser | Asked "How is my heart?" | `POST /api/speak` returned 200; Astra entered the SPEAKING state |

Limits: browser checks were visual, on one machine and one browser; no user study; synthetic data only.
