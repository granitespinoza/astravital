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

## Mission LAN integration — 2026-11-15

Windows, Node.js 26.13.1, base commit `13e48de`, synthetic seed 142.

| Check | Method | Result |
| --- | --- | --- |
| Existing suite and mission profile | `node --test` | 63 tests, 61 passed, 0 failed, two optional voice integrations skipped. |
| Crew → CMO → Ground | `tests/mission.test.js`, two scoped HTTP clients on loopback | WATCH and ALERT, conflicting packet rejection, preserved baseline, Gold and Silver lineage, CMO acknowledgement, queued report with withheld content, simulated receipt and persistent reviewed state after restart. |
| CMO desktop startup | Edge headless opening the loopback mission page | CMO console rendered, connection status became connected and the synthetic roster appeared. |
| Physical phone hotspot | Initial Wi-Fi interface probe and browser review | The Wi-Fi address differed from the old v0.6 address. A Wi-Fi-address request from the managed test environment timed out. A real phone and the full browser interaction must still be verified. |

The laptop and a physical phone were not tested together. The simulated Ground states were verified in HTTP and SQLite; they do not represent an Earth transmission.

## Earth doctor dashboard integration — 2026-11-15

Windows, Node.js 26.13.1 for the final test suite, synthetic seed 142. The merge checkpoint `80ae958` combines the integration branch with the available `origin/main` at `964c0b7`. The managed shell could not resolve GitHub to refresh that ref.

| Check | Command | Observed result |
| --- | --- | --- |
| Frozen reports, priority, bone provenance and persisted actions | `node --test --test-name-pattern="Ground" tests/mission.test.js tests/web-demo.test.js` | 2 passed, 0 failed. Simulated receipt releases crew details. SQLite actions survive reopening and browser notes survive recreating the demo. |
| Static mission snapshot | `node scripts/export-demo.mjs` | Repeated export had identical SHA-256. Four 14-sol histories, one confirmed ALERT, one WATCH and one crew member with bone evidence. |
| Full Node suite | `node --test` | 65 tests, 55 passed, 2 optional voice checks skipped. Eight HTTP tests ended with `EACCES` connecting to localhost, including the pre-existing mission test. |
| Install and build | `npm ci`, `npm run build`, `npm run verify` | The registry lookup failed with `ENOTFOUND` and the offline cache was incomplete. Both build commands stopped with `esbuild` unavailable. |
| Chrome and integrated browser | `node tests/e2e-web.mjs` and local web demo navigation | Chrome exited before exposing DevTools. The integrated browser timed out accessing localhost. The 12 visor checks and the Ground browser checks remain pending on this revision. |
| Static checks | `node --check` and `git diff --check` | Passed for changed scripts and the diff. |

After successful browser startup, set `GROUND_SCREENSHOT_PATH` to `docs/media/07-earth-doctor.png` and run `node tests/e2e-web.mjs` to capture the dashboard at 1440 × 900. Inspect the capture and the 768 px and 390 px layouts before adding it to the README. CI and the deployed demo need verification on the reviewed revision.

### Shared glasses and Ground case

`node --test tests/web-demo.test.js` passed all four tests. Alex Morgan's initial 68 bpm and repeat 73 bpm use the same readings, decisions and evidence IDs in both views. The bone decisions also match. Repeating `node scripts/export-demo.mjs` produced identical mission snapshot bytes. The direct SQLite Ground test also passed.

The browser check now exercises the case link and anatomy magnification. This run stopped before Chrome exposed DevTools, so visual verification and capture are still pending.

### N2 determinism and idempotence

[Verified result] Windows, Node.js 24.22.1, seed 142. `node --test tests/database.test.js tests/web-demo.test.js` passed all eight checks. `node --test --test-name-pattern="Ground releases" tests/mission.test.js` passed its direct SQLite check. A repeated packet retained the same evidence ID and mission sol, and changed data with that packet ID was rejected without adding layer records. Reusing a teleconsult request ID preserved one matching entry after reopening the database. The suite also checked seed and review persistence and the matching initial and repeat evidence across glasses and Ground.

The public glasses demo opened and its **Start experience** and **Body context** clicks worked. The public Ground path returned HTTP 404 at the time of inspection. The N2 result applies to the checked local code and simulated inputs. It does not certify the public Ground deployment or a prediction model.

## Experimental trend forecast — 2026-11-15

AI assistance: Anthropic Claude. macOS, Node.js 22, synthetic data only. Model: damped-trend Holt exponential smoothing (`app/forecast.js`), shown only in the Earth doctor view as "Trend forecast · experimental". The heart decision still comes from the personal-reference rule. The dashboard feeds the model one value per sol (the latest usable reading of each sol, so a same-sol repeat replaces the first check) and states the number of sols used. Method reference: damped-trend exponential smoothing as described in Hyndman and Athanasopoulos, [*Forecasting: Principles and Practice*, §8.2](https://otexts.com/fpp3/holt.html).

Method (`node scripts/forecast-eval.mjs`): 200 seeded synthetic crews × 180 sols (steady, gradual drift, short acute events). Time-ordered: each sol the model sees only earlier sols and predicts the next one. Compared with the last reading and with the fixed 14-sol personal reference mean.

| History up to sol | MAE forecast (bpm) | MAE last reading | MAE fixed reference | 80% interval coverage |
| --- | --- | --- | --- | --- |
| 14 | 1.48 | 1.51 | 1.57 | 0.75 |
| 30 | 1.49 | 1.45 | 1.83 | 0.78 |
| 60 | 1.47 | 1.45 | 2.11 | 0.79 |
| 90 | 1.51 | 1.47 | 1.94 | 0.80 |
| 179 | 1.49 | 1.46 | 3.05 | 0.81 |

Forecast WATCH warnings on steady crews: 0.016 per crew-day. On drifting crews the current two-reading rule flagged the drift earlier than the forecast (median −16 sols).

**Reading.** The forecast adapts to each person: its error stays flat while a fixed reference degrades to 3.05 bpm. Intervals are close to calibrated. It does **not** yet beat the last reading and gives no earlier warning than the rule. We therefore keep the claim "early warning" and present the forecast as an evaluated experiment, not as prediction. Next step, per [ARQUITECTURA](ARQUITECTURA.md#longitudinal-learning-and-decision-support): real longitudinal data, hidden prospective evaluation, clinician review.

## Integration verification on macOS — 2026-11-15

AI assistance: Anthropic Claude. macOS, Node.js 22.23.2, Chrome 157, synthetic seed 142, after merging the Earth doctor dashboard (PR 7) and the experimental forecast (PR 8). This run resolves the checks that the Windows integration notes above left pending.

| Check | Command | Observed result |
| --- | --- | --- |
| Build and full Node suite | `npm run verify` | 70 tests: 68 passed, 0 failed, 2 skipped (opt-in voice model integrations). |
| Web demo in headless Chrome | `node tests/e2e-web.mjs` | 29/29 checks: glasses journey, saved review after reload, Earth doctor view on the same repeated check, experimental forecast shown to the doctor and never on the glasses, one value per sol, inbox OK rows, Ground note after reload, bone scan, missing scan disclosure, 768 px and 390 px layouts, no external requests, no JavaScript errors. With software WebGL (`GROUND_SCREENSHOT_PATH`), the three anatomy magnification checks also pass and the capture is `docs/media/07-earth-doctor.png`. |
| Full local app in headless Chrome | `node tests/e2e-local.mjs` (`npm run test:functional`) | 17/17 checks on a real server and a fresh SQLite file in the mission profile: glasses connect locally, Astra answers from the server, a confirmed review is stored once, a paired crew client sends two strong deviations, the CMO sees and acknowledges the ALERT and the saved review, a report waits in the simulated Earth queue, simulated receipt releases it, the doctor inbox puts the confirmed ALERT first, the heart panel shows the persisted deviation and the forecast, the doctor's note is stored in SQLite, and nothing leaves 127.0.0.1. |
| Earlier glasses simulator | `npm run test:browser` | Passed. |
| Published site | CI job `e2e` after each GitHub Pages deploy, plus a local run with `E2E_URL` | All checks passed against https://granitespinoza.github.io/astravital/, including the Earth doctor view (the earlier HTTP 404 note predates its deployment). |

Clarifications made in this pass: one UTC time format across the CMO and Ground views; inbox OK rows use the same ✓ status as elsewhere; "Confirmed ALERT" always means two consecutive ALERT readings in the same direction, a single ALERT after a WATCH reads "ALERT · awaiting a second ALERT", and the panels say "Deviation persisted on repeat" instead of suggesting another repeat; `npm run test:functional` now runs the full local app check (the script it named did not exist). The laptop-with-physical-phone test over Wi-Fi remains unverified.

### Dialogue fix found by the live walkthrough — 2026-11-15

A manual walkthrough of the published demo found that *"Can you diagnose me?"* and *"What treatment should I take?"* opened the details panel instead of declining in the conversation, *"Do I have heart disease?"* and *"Is this a heart attack?"* received a heart status, and *"Should I take medication?"* got a clarifying question. Astra now declines diagnosis, disease, treatment and medication questions in the conversation and refers possible emergencies (heart attack, chest pain, fainting, breathing) to the onboard medical officer at once. Covered by the test *diagnosis, treatment and emergency questions are declined or referred, never answered with a status* and the web demo check *asked for a diagnosis, Astra declines in the conversation*. `node --test`: 71 tests, 69 passed, 0 failed, 2 opt-in voice skips.

### Durability of the public demo until results — 2026-11-15

Judging runs until 26 January 2027, so the published demo must keep working without changes. `E2E_DATE=<date> node tests/e2e-web.mjs` runs every page with the browser clock shifted (and checks that the shift took effect). All 34 web demo checks, plus the clock check, passed with the clock at 2026-12-03, 2026-12-17, 2027-01-26 and 2027-03-31 (35/35 each): the web demo uses precomputed seed-142 states and never marks them stale. The post-deploy job now repeats the live-site run with the clock at 2027-01-26. A **Reset demo** control returns a revisiting browser to the first state, and the Earth doctor link no longer depends on `URLSearchParams.size`, which Safari 16 lacks. Browsers other than Chromium were not tested automatically.

## Final UX pass (Nielsen's heuristics) — 2026-11-15

AI assistance: Anthropic Claude. Scope: the desktop experience first; phones and tablets are covered only by automatic checks (no horizontal overflow, text size, contrast), not by visual polish.

| Heuristic | What changed |
| --- | --- |
| Visibility of system status | Header and hero say what ASTRAVITAL is; the lens shows the voice state ("Say OK Astra", listening, a doctor reply arrived); each reply shows the question it answers; status colour plus icon plus text everywhere. |
| Match with the real world | Plain-language hero with the three roles (Astra in the glasses, the onboard medical officer, the Earth doctor); Astra greets the astronaut by name. |
| User control and freedom | A **Full motion** switch (on by default; a person can reduce motion and the choice is remembered), Skip transition, Replay intro, Reset demo, Cancel before saving. Scripted scrolling follows the same preference. |
| Consistency | One wording for "Confirmed ALERT", one time format (UTC), one status vocabulary on the glasses, CMO and Earth doctor pages. |
| Error prevention and recovery | Separate confirmation before saving or sending; empty Send explains what to type; microphone errors say what to do. |
| Recognition rather than recall | **How to try it (30 s)** guide, suggested questions, a hint in the lens, a primary action that changes with the case ("Check again", "Prepare review", "Message your medical team"). |
| Aesthetic and minimalist design | Evidence and history moved below the decision; patient card first on the doctor page; the lens frame is a light-cyan glass that holds the HUD with margin on every side. |
| Readability | 79 font-size declarations raised to at least 12 px and five low-contrast colours lightened; the automatic audit now fails if any visible text is under 12 px or below WCAG AA contrast (4.5:1, measured against solid backgrounds, so an approximation and not a certification). |

**Motion.** The wearer-view lens drifts sideways and a glint crosses the glass; in the intro the 3D glasses move on their own (about ±35° left and right, a gentle pitch and roll, and a small drift) and tilt toward the cursor, as if dragged; a real WebGL browser pane showed clearly different angles, heights and positions across frames 1.5 s apart. The entry into the lens lasts 3.8 s (it was 2.4 s). Full motion is on by default, even when the system asks to reduce motion, because the lens must be seen to move; when a person switches it off, the entry becomes a 1.6 s fade and the idle movement stops. Earlier, with the system setting on, every animation was switched off without any notice. An automatic test samples the lens position twice and requires it to change.

**Independent review.** Two read-only Claude agents reviewed the change in parallel, one critiquing screenshots of both pages at three widths and one reviewing the diff. Their 16 findings were checked one by one: all were real and were fixed (reduced-motion pose of the glasses, a sway jump at the start, smooth scrolling ignoring the motion setting, switch semantics, header and hero density, lens content too close to the frame, wide form fields, the doctor's reply button on narrow screens, touch-target sizes) except one, kept on purpose: the large burned-in "AI-generated image" watermark and the smaller caption that also names the tool, because the Space Apps rules require a visible watermark.

**Checks (macOS, Node 22.23.2).** `node --test`: 75 tests, 73 passed, 0 failed, 2 opt-in voice skips. `node tests/e2e-web.mjs`: 84/84, and 85/85 with the clock set to 2026-12-03 and 2027-01-26. `node tests/e2e-local.mjs`: 17/17.

**Limits.** Safari and Firefox were not tested. Voice with a real microphone was not tested (the test uses a stand-in recogniser). The 3D motion is verified by hand in a real WebGL pane, not by the automatic tests, because headless Chrome in CI has no GPU. Phone and tablet layouts were not visually polished.
